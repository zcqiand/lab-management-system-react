// AppShell — sidebar (left) + content (right) 业务页骨架（layout route）。
//
// nextjs 仓 app-shell.tsx 的镜像（Sprint 2 Batch 0），差异：
//   - 菜单从 saas 拉取 → 静态 MENU_TREE（menus.ts）
//   - 守卫：nextjs 在 (console)/layout.tsx 做 !token → /login；react 仓把
//     useRequireAuth 提升到这里（包 Outlet），22 条业务子路由不再各自守卫
//   - header 的 token 显示走 auth FSM（lab.accessToken 契约 key）
// 内容是 <Outlet />（react-router layout route），切页只换 Outlet 子树，
// 侧栏稳定不重挂（等价 nextjs 把 AppShell 收敛到 route group layout）。

import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { APP_CODE, APP_NAME, MENU_TREE } from "@/components/app/menus";
import { BackendSwitcher } from "@/components/app/backend-switcher";
import { useAuth } from "@/state/auth-context";
import { useRequireAuth } from "@/state/require-auth";

export function AppShell() {
  const { state, logout } = useAuth();
  const { checking } = useRequireAuth();
  const navigate = useNavigate();

  const token =
    state.kind === "authenticated" ? (state.value.tokenExpiresAt > 0 ? "ok" : null) : null;
  const displayName =
    state.kind === "authenticated" || state.kind === "awaiting_tenant"
      ? (state.value.user.displayName ?? state.value.user.username)
      : "";

  if (checking) return null; // guard effect 已触发跳转，渲染空避免闪烁

  return (
    <div className="min-h-screen flex bg-slate-50">
      <SidebarNav
        menus={MENU_TREE}
        appCode={APP_CODE}
        appName={APP_NAME}
        footerExtras={<BackendSwitcher />}
        version={`lab-management-system-react · appCode=${APP_CODE}`}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center px-6 gap-4">
          <h1 className="text-base font-semibold" data-testid="appshell-app-name">
            {APP_NAME}
          </h1>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            {displayName && (
              <span className="font-mono">
                用户=<span className="text-slate-900 font-medium">{displayName}</span>
              </span>
            )}
            <span data-testid="appshell-auth-state">{state.kind}</span>
            {state.kind === "authenticated" ? (
              <Button
                variant="outline"
                size="sm"
                data-fn="M01.F05.I04"
                data-testid="logout-button"
                onClick={() => {
                  void logout();
                  void navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4 mr-1" />
                登出
              </Button>
            ) : null}
            {token === null && state.kind !== "authenticated" ? null : null}
          </div>
        </header>
        <section className="flex-1 overflow-auto p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
