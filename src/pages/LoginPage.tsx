// LoginPage — M01.F05.I01（用户名+密码登录）+ M00.F02（多租户登录走选租户页）。

import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/state/auth-context";
import { isErrorResponse } from "@/state/auth-context";

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 已登录访问 /login → 直接回业务页
  if (state.kind === "authenticated") {
    return <Navigate to={params.get("from") ?? "/"} replace />;
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
    // FSM 已推进：单租户 → authenticated，多租户 → awaiting_tenant
    // navigate 由 guard/redirect 处理，这里兜底回 from
    navigate(params.get("from") ?? "/", { replace: true });
  }

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <FlaskConical className="text-primary size-8" />
          <h1 className="text-xl font-semibold">实验室管理系统</h1>
          <p className="text-muted-foreground text-sm">请登录以继续</p>
        </div>
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
