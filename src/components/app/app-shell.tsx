// AppShell — sidebar (left) + content (right) 业务页骨架（layout route）。
//
// nextjs 仓 app-shell.tsx 的镜像（Sprint 2 Batch 0），差异：
//   - 菜单从 lab 后端 /api/auth/menus 拉取（springboot 侧 saas 快照缓存；
//     2026-08-27 起 demo 兜底删除，miss 503 上抛错误，AppShell 由 ErrorBoundary 兜）
//   - 守卫：nextjs 在 (console)/layout.tsx 做 !token → /login；react 仓把
//     useRequireAuth 提升到这里（包 Outlet），22 条业务子路由不再各自守卫
//   - header 的 token 显示走 auth FSM（lab.accessToken 契约 key）
// 内容是 <Outlet />（react-router layout route），切页只换 Outlet 子树，
// 侧栏稳定不重挂（等价 nextjs 把 AppShell 收敛到 route group layout）。

import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav, useBackendMenus } from "@/components/app/sidebar-nav";
import { APP_CODE, APP_NAME } from "@/components/app/menus";
import { BackendBadge } from "@/components/app/backend-badge";
import { useAuth } from "@/state/auth-context";
import { useRequireAuth } from "@/state/require-auth";

// 菜单加载错误态（demo 兜底删除后，菜单拉不到 → 错误而非静态回退）。
function MenuLoadError({ error }: { error: Error }) {
  return (
    <aside
      className="w-64 shrink-0 border-r bg-white flex flex-col items-center justify-center p-6 text-center"
      data-testid="appshell-menu-error"
    >
      <h2 className="text-base font-semibold text-rose-700 mb-2">菜单加载失败</h2>
      <p className="text-xs text-slate-600 mb-4 break-all" data-testid="appshell-menu-error-msg">
        {error.message}
      </p>
      <p className="text-xs text-slate-500">
        后端 /api/auth/menus miss（503 MENUS_UNAVAILABLE）；demo 兜底已删除，请重登或联系管理员。
      </p>
    </aside>
  );
}

export class AppShellErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (this.state.error) {
      return <MenuLoadError error={this.state.error} />;
    }
    return this.props.children;
  }
}

export function AppShell() {
  const { state, logout } = useAuth();
  const { checking } = useRequireAuth();
  const navigate = useNavigate();
  // 菜单从 lab 后端 /api/auth/menus 拉：失败上抛（demo 兜底删除），由
  // AppShellErrorBoundary 渲染错误态而非静默回退静态树。
  const { data: backendMenus, loading: menusLoading } = useBackendMenus();
  const token =
    state.kind === "authenticated" ? (state.value.tokenExpiresAt > 0 ? "ok" : null) : null;
  const displayName =
    state.kind === "authenticated" || state.kind === "awaiting_tenant"
      ? (state.value.user.displayName ?? state.value.user.username)
      : "";

  if (checking) return null; // guard effect 已触发跳转，渲染空避免闪烁

  return (
    <div className="min-h-screen flex bg-slate-50">
      {menusLoading ? (
        <aside
          className="w-64 shrink-0 border-r bg-white flex items-center justify-center"
          data-testid="appshell-menu-loading"
        >
          <span className="text-xs text-slate-500">菜单加载中…</span>
        </aside>
      ) : (
        <SidebarNav
          menus={backendMenus ?? []}
          appCode={APP_CODE}
          appName={APP_NAME}
          footerExtras={<BackendBadge />}
          version={`lab-management-system-react · appCode=${APP_CODE}`}
        />
      )}
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