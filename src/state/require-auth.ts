// 路由守卫 hook — M01.F04.I03（未登录/无权限拦截）。
//
// 规则：
//   - idle / anonymous → 重定向 /login（带 from 回跳参数）
//   - awaiting_tenant → 重定向 /select-tenant（先选租户再进业务页）
//   - authenticated + requiredPermissions 缺权 → 拦在 /403

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/state/auth-context";

export interface RequireAuthOptions {
  /** 该路由要求的 permission 列表（空数组 = 只要登录） */
  permissions?: string[];
}

export function useRequireAuth(options: RequireAuthOptions = {}): {
  allowed: boolean;
  checking: boolean;
} {
  const { state } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const required = options.permissions ?? [];

  useEffect(() => {
    if (state.kind === "idle") return; // hydrate 中，先不动
    if (state.kind === "anonymous") {
      navigate(`/login?from=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }
    if (state.kind === "awaiting_tenant") {
      navigate("/select-tenant", { replace: true });
      return;
    }
    const missing = required.filter((p) => !state.value.permissions.includes(p));
    if (missing.length > 0) {
      navigate("/403", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind]);

  if (state.kind === "authenticated") {
    const allowed = required.every((p) => state.value.permissions.includes(p));
    return { allowed, checking: false };
  }
  return { allowed: false, checking: state.kind === "idle" };
}
