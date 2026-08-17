// LoginPage — M01.F05.I03（SSO 授权码流）纯 orchestrator，镜像 nextjs /login。
//
// 对齐 nextjs 模型（2026-08-18 认证收口）：登录全部委托 saas 身份平台，
// 本页无用户名密码表单。三分支：
//   1. URL 带 ?token=（saas 已换 token）→ 存 localStorage + GET /me 建会话 → 跳业务页
//   2. URL 带 ?code=&state=（未换 token）→ POST /api/auth/sso/callback 换 mock-jwt → 跳业务页
//   3. 无回调参数 → GET /api/auth/sso/authorize → window.location 跳 saas /login
// SSO 环路保护（bad-path-redirect flag）保留：saas 返回 /undefined 时降级提示。

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/state/auth-context";
import { useBackend } from "@/state/backend-context";
import { BACKEND_REGISTRY_DEFAULT } from "@/api/contracts";
import { authSsoAuthorize, authSsoCallback } from "@/api/endpoints/endpoints";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";
import { clearSsoBroken } from "@/components/app/bad-path-redirect";
import { TOKEN_STORAGE_KEYS } from "@/api/contracts";
import type { LoginResponse } from "@/api/endpoints/endpoints.schemas";

export function LoginPage() {
  const { state, setSession } = useAuth();
  const { backend, baseUrl } = useBackend();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<string>("检查登录态…");

  // 当前 backend 是否启用 SSO（msw/nextjs 启用，springboot/aspnetcore 暂关）。
  const ssoEnabled =
    BACKEND_REGISTRY_DEFAULT.available.find((b) => b.id === backend)?.features
      .sso === true;

  useEffect(() => {
    void (async () => {
    if (!ssoEnabled) {
      setStatus(`当前 backend（${backend}）未启用 SSO，请切到 msw / nextjs 后端`);
      return;
    }
    if (state.kind !== "anonymous" && state.kind !== "idle") return;

    // SSO loop break：saas 端返回 /undefined 字面量时跳过 SSO，显示提示不再跳。
    if (typeof window !== "undefined" && sessionStorage.getItem("lab.sso.broken")) {
      setStatus("检测到 SSO 重定向环（saas 端返回 /undefined 字面量），已停止自动跳转");
      return;
    }

    // 阶段 1：saas 跳回 lab 的 URL 带 ?token=（已换 token）→ 存 localStorage +
    // GET /api/auth/me 拿 user/tenants → setSession 建会话 → 跳业务页。
    const tokenFromSaas = params.get("token");
    if (tokenFromSaas) {
      setStatus("登录成功，正在进入系统…");
      localStorage.setItem(TOKEN_STORAGE_KEYS.accessToken, tokenFromSaas);
      clearSsoBroken();
      try {
        // msw /api/auth/me 返回 { user, tenants, currentTenantId }
        const meResp = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${tokenFromSaas}` },
        });
        if (!meResp.ok) throw new Error(`/me HTTP ${meResp.status}`);
        const data = (await meResp.json()) as {
          user: LoginResponse["user"];
          tenants: LoginResponse["tenants"];
          currentTenantId?: string;
        };
        await setSession({
          accessToken: tokenFromSaas,
          user: data.user,
          tenants: data.tenants,
        });
        params.delete("token");
        params.delete("state");
        const cleanSearch = params.toString();
        navigate(
          sanitizeRedirect(params.get("from")) + (cleanSearch ? `?${cleanSearch}` : ""),
          { replace: true },
        );
      } catch (err) {
        console.error("[lab/login] /api/auth/me failed:", err);
        setStatus(`token 已存但 /me 失败（${backend}）：${(err as Error).message ?? "unknown"}`);
      }
      return;
    }

    // 阶段 2：saas 给的是 ?code=&state=（未换 token）→ POST /api/auth/sso/callback 换 mock-jwt
    const code = params.get("code");
    const stateParam = params.get("state");
    if (code && stateParam) {
      setStatus("拿到 saas code，正在换 token…");
      authSsoCallback({ code, state: stateParam }, { baseURL: baseUrl })
        .then((resp) => {
          const data = resp.data as LoginResponse;
          if (data.token) {
            clearSsoBroken();
            void setSession({
              accessToken: data.token,
              user: data.user,
              tenants: data.tenants,
              refreshToken: data.refreshToken,
            }).then(() => {
              navigate(sanitizeRedirect(params.get("from")), { replace: true });
            });
          } else {
            setStatus("code 换 token 失败：响应无 token");
          }
        })
        .catch((err) => {
          setStatus(`code 换 token 失败（${(err as Error).message ?? "unknown"}）`);
        });
      return;
    }

    // 阶段 3：没有 saas 回调参数 → 调 authorize 让 saas 跳过来
    setStatus(`未登录，正在跳 saas 身份平台（backend=${backend}）…`);
    const from = params.get("from");
    const redirect = sanitizeRedirect(from);
    try {
      const resp = await authSsoAuthorize({ redirect }, { baseURL: baseUrl });
      const url = (resp.data as { authorizeUrl?: string }).authorizeUrl;
      if (url) {
        window.location.href = url;
      } else {
        setStatus("authorizeUrl 缺失，请检查 msw / saas 配置");
      }
    } catch (err) {
      setStatus(`SSO 跳转失败（${(err as Error).message ?? "unknown"}）`);
    }
    })();
  }, [ssoEnabled, state.kind, params, baseUrl, navigate, setSession, backend]);

  // 已登录访问 /login → 直接回业务页
  if (state.kind === "authenticated") {
    navigate(sanitizeRedirect(params.get("from")), { replace: true });
  }

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <FlaskConical className="text-primary size-8" />
          <h1 className="text-xl font-semibold">实验室管理系统</h1>
          <p className="text-muted-foreground text-sm">SSO 登录（委托 saas 身份平台）</p>
        </div>
        <p className="text-muted-foreground mb-4 text-sm" data-testid="login-status">
          {status}
        </p>
        <p className="text-muted-foreground/70 text-xs">
          流程：lab /login → saas /login → 带 token 回 lab /login → 进入系统
        </p>
        <p className="text-muted-foreground/70 text-xs">
          demo 后端：{backend} · saas 端口：3000
        </p>
      </div>
    </div>
  );
}
