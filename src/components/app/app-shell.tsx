// AppShell — 业务页统一骨架（sidebar + 顶栏 BackendSwitcher + 内容区）。
// Sprint 1 只装配；sidebar 菜单内容 Sprint 2 随 26 页镜像填充。

import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { FlaskConical, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav, type NavItem } from "@/components/app/sidebar-nav";
import { BackendSwitcher } from "@/components/app/backend-switcher";
import { useAuth } from "@/state/auth-context";

// Sprint 1：只有仪表盘一项。菜单树数据源（GET /auth/menus）Sprint 2 接。
const NAV: NavItem[] = [
  { label: "仪表盘", path: "/", icon: "dashboard" },
];

const NAV_ICONS: Record<string, ReactNode> = {
  dashboard: <LayoutDashboard className="size-4" />,
};

export function AppShell() {
  const { state, logout } = useAuth();
  const displayName =
    state.kind === "authenticated" || state.kind === "awaiting_tenant"
      ? (state.value.user.displayName ?? state.value.user.username)
      : "";
  const tenantName = state.kind === "authenticated" ? state.value.tenant.name : "";

  return (
    <div className="flex h-screen">
      <aside className="border-r bg-sidebar flex w-60 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <FlaskConical className="text-primary size-5" />
          <span className="font-semibold">实验室管理系统</span>
        </div>
        <SidebarNav items={NAV} icons={NAV_ICONS} />
        <div className="mt-auto border-t p-3">
          <SidebarNav
            items={[
              {
                label: "退出登录",
                action: "logout",
                icon: "logout",
              } as NavItem,
            ]}
            icons={{ logout: <LogOut className="size-4" /> }}
            onAction={() => void logout()}
          />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b flex h-14 items-center justify-between px-4">
          <div className="text-muted-foreground text-sm">
            {tenantName ? `${tenantName} · ${displayName}` : displayName}
          </div>
          <BackendSwitcher />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { Button };
