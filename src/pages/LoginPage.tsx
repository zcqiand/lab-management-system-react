// LoginPage — M01.F05.I03（SSO OAuth 2.0 授权码流）纯 orchestrator，镜像 nextjs /login。
//
// 对齐 nextjs 模型（2026-08-19 OAuth 2.0 收口）：登录全部委托 saas 身份平台走
// OAuth 2.0 授权码模式（RFC 6749），lab 后端 confidential client（持 client_secret）。
// 两分支：
//   1. URL 带 ?code=&state=（saas 已授权）→ 验 state（防 CSRF）→ POST /api/auth/sso/callback
//      换 lab 自家 JWT（grant_type=authorization_code，client_secret 仅后端持有，
//      saas token 不出 lab 后端）→ setSession 进业务页
//   2. 无回调参数 → 生成 state 存 sessionStorage → GET /api/auth/sso/authorize
//      （response_type=code, client_id, redirect_uri, state）→ window.location 跳 saas
// 旧的 ?token= shortcut 已删除：不符合 OAuth 2.0 + 首登缺 refreshToken 必抛错。
// SSO 环路保护（bad-path-redirect flag）保留：saas 返回 /undefined 时降级提示。

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { AxiosError } from "axios";
import { useAuth } from "@/state/auth-context";
import { getApiBaseUrl, getApiMode } from "@/api/backend-config";
import { authSsoAuthorize, authSsoCallback } from "@/api/endpoints/endpoints";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";
import { clearSsoBroken } from "@/components/app/bad-path-redirect";
import type {
  LoginResponse,
  OAuthGrantType,
  OAuthResponseType,
} from "@/api/endpoints/endpoints.schemas";

// OAuth 2.0 client_id：契约必填参数，但真 client_id 由 lab 后端 env 权威持有
// （springboot LAB_SAAS_CLIENT_ID=UUID V014 seed；nextjs SAAS_OAUTH_CLIENT_ID），
// 前端传的值会被后端忽略，但 saas-aspnetcore authorize 端点会查 apps.client_id，
// V014/V015 收敛为固定 UUID '11111111-1111-1111-1111-111111111111' ——
// 前端必须发同一 UUID，否则 saas 返 401。
// （2026-08-29 修 prod 401：lab-react 之前硬编码 "lab-mgmt" → 改 env 读；与 lab-nextjs 同款。）
const OAUTH_CLIENT_ID =
  import.meta.env.VITE_SAAS_CLIENT_ID ?? "11111111-1111-1111-1111-111111111111";
const SSO_STATE_STORAGE_KEY = "lab.sso.state";
// 业务回跳路径（?from=）存 sessionStorage 随 state 走。RFC 6749 §3.1.2 要求
// redirect_uri 与注册白名单精确匹配——不能把 from 塞进 redirect_uri（带 query
// 的变体 /login?from=%2F 匹配不上白名单注册的裸 /login，saas 必返 INVALID_REDIRECT_URI）。
const SSO_FROM_STORAGE_KEY = "lab.sso.from";

// 生成 OAuth 2.0 state 字符串（防 CSRF，RFC 6749 §10.12）。
// crypto.getRandomValues 是浏览器原生密码学随机，足够强；生成的字符串 base64url 编码。
function generateOauthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 计算 authorize/callback 的 redirect_uri：lab 自己绝对地址的裸 /login 路径。
// RFC 6749 §3.1.2：必须与 saas 注册白名单精确匹配，不带任何 query 参数。
// 业务回跳（from）不放这里，走 SSO_FROM_STORAGE_KEY。
function computeRedirectUri(): string {
  if (typeof window === "undefined") return "/login";
  return `${window.location.origin}/login`;
}

export function LoginPage() {
  const { state, setSession } = useAuth();
  const baseUrl = getApiBaseUrl();
  const apiMode = getApiMode();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<string>("检查登录态…");

  // ADR-0014：后端塌缩到单 URL 后，"当前 backend 是否启用 SSO" 简化为
  // "是否配了后端"（baseUrl 非空 = 同源走 Route Handler 或跨源走真后端，SSO 都可达）。
  // 历史上 msw/nextjs/springboot/aspnetcore 都已落地 SSO handler，不再按 mode 区分。
  const ssoEnabled = true;

  useEffect(() => {
    void (async () => {
      if (!ssoEnabled) {
        setStatus(`当前 backend（${apiMode}）未启用 SSO，请检查 VITE_API_BASE_URL`);
        return;
      }
      // 等 hydrate 完成（state.kind: idle → anonymous）后再触发 SSO。
      // 否则 StrictMode + state 转移会让这个 effect 多次跑、覆盖 sessionStorage 的 csrfState，
      // 回跳时 state 校验失败（一直卡在 "state 校验失败" 页）。
      if (state.kind !== "anonymous") return;

      // SSO loop break：saas 端返回 /undefined 字面量时跳过 SSO，显示提示不再跳。
      if (typeof window !== "undefined" && sessionStorage.getItem("lab.sso.broken")) {
        setStatus("检测到 SSO 重定向环（saas 端返回 /undefined 字面量），已停止自动跳转");
        return;
      }

      // 阶段 1：OAuth 2.0 授权码模式（RFC 6749 §4.1）
      // saas 回跳带 ?code=&state= → 先验 state（防 CSRF）→ POST sso/callback
      // 换 lab 自家 JWT（grant_type=authorization_code，client_secret 仅后端持有，
      // saas token 不出 lab 后端）→ setSession 进业务页。
      const code = params.get("code");
      const stateParam = params.get("state");
      const fromParam = params.get("from");
      // 回跳时 URL 是裸 /login（redirect_uri 不带 query），from 从 sessionStorage 恢复
      const fromStored =
        typeof window !== "undefined"
          ? sessionStorage.getItem(SSO_FROM_STORAGE_KEY)
          : null;
      const from = fromParam ?? fromStored;
      if (code && stateParam) {
        // 验 state：sessionStorage 存的 vs URL 回跳的必须一致（防 CSRF 攻击）。
        // 失败说明 state 被偷换或 session 过期，拒换 token 并清掉 storage 让用户重试。
        const expectedState =
          typeof window !== "undefined"
            ? sessionStorage.getItem(SSO_STATE_STORAGE_KEY)
            : null;
        if (!expectedState || expectedState !== stateParam) {
          setStatus("state 校验失败（可能 session 过期或被攻击），请重新登录");
          sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
          return;
        }
        // state 验证通过，立即清掉（一次性）
        sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
        // 清掉 URL 上的 code/state 防止 reload 时重复触发阶段 1
        params.delete("code");
        params.delete("state");
        const cleanSearch = params.toString();
        const cleanUrl =
          window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "");

        setStatus("拿到 saas code，正在换 token…");
        try {
          const resp = await authSsoCallback(
            {
              grant_type: "authorization_code" satisfies OAuthGrantType,
              code,
              redirect_uri: computeRedirectUri(),
              // RFC 6749 §4.1.3 + shared 契约四字段：state 原样回传（后端 cookie 校验 CSRF）
              state: stateParam,
            },
            { baseURL: baseUrl },
          );
          const data = resp.data as LoginResponse;
          if (data.token) {
            clearSsoBroken();
            await setSession({
              accessToken: data.token,
              user: data.user,
              tenants: data.tenants,
              refreshToken: data.refreshToken,
            });
            // 用 replace 清掉 URL 残留（code/state 已删，但 replace 也保证不留历史记录）
            window.history.replaceState(null, "", cleanUrl);
            sessionStorage.removeItem(SSO_FROM_STORAGE_KEY);
            navigate(sanitizeRedirect(from), { replace: true });
          } else {
            setStatus("code 换 token 失败：响应无 token");
          }
        } catch (err) {
          // 把 MSW 响应体打到 console，下次触发就能直接看到 INVALID_GRANT 的 message
          // 字符串（不用翻 Network）。生产环境换成 toApiError 走 error boundary。
          const axErr = err as AxiosError<{ code: string; message: string }>;
          console.error("sso callback failed:", axErr.response?.data ?? axErr.message);
          // 失败也清掉 URL 残留的 code/state —— dev server 重启 / Vite HMR 会清空 MSW
          // 进程内的 oauthCodes Map，导致同一个 code 第二次 callback 必返 INVALID_GRANT。
          // 不清 URL 的话，用户每次刷新都会重跑这条失败路径；清掉后用户能直接点登录按钮走密码流程。
          window.history.replaceState(null, "", cleanUrl);
          setStatus(`code 换 token 失败（${(err as Error).message ?? "unknown"}）`);
        }
        return;
      }

      // 阶段 2：无回调参数 → 调 authorize 让 saas 跳过来
      setStatus(`未登录，正在跳 saas 身份平台（backend=${apiMode}）…`);
      // from 存 sessionStorage 随 state 走（redirect_uri 保持裸 /login 精确匹配白名单）
      if (from) sessionStorage.setItem(SSO_FROM_STORAGE_KEY, from);
      // 用绝对 URL 指向本仓裸 /login。saas 收到 redirect_uri 后会原样回跳到
      // /login?code=...&state=...，让 LoginPage 进入阶段 1 验 state 后换 token。
      // client_id 与 saas 注册的应用标识对应。
      // 幂等：StrictMode 让 effect 多次跑时复用已存的 csrfState，避免用不同 state 覆盖
      // sessionStorage 导致回跳时 state 校验失败。
      let csrfState = sessionStorage.getItem(SSO_STATE_STORAGE_KEY);
      if (!csrfState) {
        csrfState = generateOauthState();
        sessionStorage.setItem(SSO_STATE_STORAGE_KEY, csrfState);
      }
      try {
        const resp = await authSsoAuthorize(
          {
            response_type: "code" satisfies OAuthResponseType,
            client_id: OAUTH_CLIENT_ID,
            redirect_uri: computeRedirectUri(),
            state: csrfState,
          },
          { baseURL: baseUrl },
        );
        const url = (resp.data as { authorizeUrl?: string }).authorizeUrl;
        if (url) {
          window.location.href = url;
        } else {
          setStatus("authorizeUrl 缺失，请检查 msw / saas 配置");
        }
      } catch (err) {
        setStatus(`SSO 跳转失败（${(err as Error).message ?? "unknown"}）`);
        sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
      }
    })();
  }, [ssoEnabled, state.kind, params, baseUrl, navigate, setSession, apiMode]);

  // 已登录访问 /login → 直接回业务页（render 期副作用挪进 useEffect，避免
  // "Cannot update a component (BrowserRouter) while rendering a different component" 报错）
  useEffect(() => {
    if (state.kind === "authenticated") {
      navigate(sanitizeRedirect(params.get("from")), { replace: true });
    }
  }, [state.kind, navigate, params]);

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <FlaskConical className="text-primary size-8" />
          <h1 className="text-xl font-semibold">建筑工程实验室管理系统</h1>
          <p className="text-muted-foreground text-sm">
            SSO 登录（OAuth 2.0 授权码模式）
          </p>
        </div>
        <p className="text-muted-foreground mb-4 text-sm" data-testid="login-status">
          {status}
        </p>
        <p className="text-muted-foreground/70 text-xs">
          流程：lab /login → saas /authorize → saas 登录 → 带 code 回 lab /login → lab
          后端 换 token
        </p>
        <p className="text-muted-foreground/70 text-xs">
          demo 后端：{apiMode} · saas 端口：3000
        </p>
      </div>
    </div>
  );
}
