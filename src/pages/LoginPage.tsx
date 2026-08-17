// LoginPage — M01.F05.I01（用户名+密码登录）+ M00.F02（多租户登录走选租户页）。
//
// 登录方式按当前 backend.features.sso 切换：
//   - sso: true  → 挂载即 GET /api/auth/sso/authorize → window.location = authorizeUrl
//                 （saas-identity-platform dev server 在 SAAS_BASE_URL，默认 :3000）
//   - sso: false → 本地用户名+密码表单（POST /api/auth/login → mock-jwt）

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/state/auth-context";
import { isErrorResponse } from "@/state/auth-context";
import { useBackend } from "@/state/backend-context";
import { BACKEND_REGISTRY_DEFAULT } from "@/api/contracts";
import { authSsoAuthorize } from "@/api/endpoints/endpoints";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";
import { clearSsoBroken } from "@/components/app/bad-path-redirect";

export function LoginPage() {
  const { state, login } = useAuth();
  const { backend } = useBackend();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  // 当前 backend 是否启用 SSO（msw/nextjs 启用，springboot/aspnetcore 暂关）。
  const ssoEnabled =
    BACKEND_REGISTRY_DEFAULT.available.find((b) => b.id === backend)?.features
      .sso === true;

  // SSO 启用 → 挂载即拉 authorizeUrl，浏览器跳 saas /login?redirect=...。
  // 回跳由 saas-identity-platform 处理：登录成功后跳回 lab 的
  // /api/auth/sso/callback，后端 (msw / nextjs) 给 mock-jwt 或真 JWT；
  // 401 / 网络失败时降级回本地表单，让用户能用账号密码兜底。
  useEffect(() => {
    if (!ssoEnabled) return;
    if (state.kind !== "anonymous" && state.kind !== "idle") return;
    // SSO loop break: BadPathRedirect 抓到 /undefined 等字面量路径时会设
    // sessionStorage flag。saas post-login 拼接 `${redirect}` 渲染成 "undefined"
    // 时会出现 ping-pong：lab 跳 saas → saas 跳回 /undefined → BadPathRedirect
    // → / → useRequireAuth → /login?from=/ → 又跳 saas …。这里读到 flag 后
    // 跳过 SSO，直接显示本地表单让用户走账号密码兜底。
    if (typeof window !== "undefined" && sessionStorage.getItem("lab.sso.broken")) {
      setSsoError(
        "检测到 SSO 重定向环（saas 端返回 /undefined 字面量），已切到本地账号密码登录",
      );
      return;
    }
    let cancelled = false;
    const from = params.get("from");
    const redirect = sanitizeRedirect(from);
    authSsoAuthorize({ redirect })
      .then((resp) => {
        if (cancelled) return;
        window.location.href = resp.data.authorizeUrl;
      })
      .catch((err) => {
        if (cancelled) return;
        setSsoError(
          `SSO 跳转失败（${err?.message ?? "unknown"}），可改用账号密码登录`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [ssoEnabled, state.kind, params]);

  // 已登录访问 /login → 直接回业务页
  if (state.kind === "authenticated") {
    return <Navigate to={sanitizeRedirect(params.get("from"))} replace />;
  }
  if (state.kind === "awaiting_tenant") {
    return <Navigate to="/select-tenant" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const resp = await login({ username, password });
    setSubmitting(false);
    if (isErrorResponse(resp)) {
      setError("用户名或密码错误");
      return;
    }
    // 登录成功 → 清掉 SSO broken flag（让下次会话能重试 SSO，如果 saas 已修）
    clearSsoBroken();
    // FSM 已推进：单租户 → authenticated，多租户 → awaiting_tenant
    // navigate 由 guard/redirect 处理，这里兜底回 from
    navigate(sanitizeRedirect(params.get("from")), { replace: true });
  }

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <FlaskConical className="text-primary size-8" />
          <h1 className="text-xl font-semibold">实验室管理系统</h1>
          <p className="text-muted-foreground text-sm">
            {ssoEnabled ? "正在跳转到 saas 身份平台登录…" : "请登录以继续"}
          </p>
        </div>
        {ssoError ? (
          <p className="text-destructive mb-2 text-xs">{ssoError}</p>
        ) : null}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "登录中…" : "登录"}
          </Button>
        </form>
      </div>
    </div>
  );
}