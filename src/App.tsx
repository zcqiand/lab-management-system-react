// App — react-router 路由入口（Sprint 1）。
//
// 结构：
//   /login, /select-tenant     公共页（不带 AppShell）
//   /                          AppShell + 守卫业务页（Sprint 1 只有仪表盘空壳）
//   *                          兜底 404
//
// 守卫：GuardedDashboard 内 useRequireAuth（M01.F04.I03）— idle 挂起、
// anonymous → /login、awaiting_tenant → /select-tenant、缺权 → 拦截。

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/app/app-shell";
import { LoginPage } from "@/pages/LoginPage";
import { SelectTenantPage } from "@/pages/SelectTenantPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { useRequireAuth } from "@/state/require-auth";
import { EmptyState } from "@/components/app/empty-state";

function GuardedDashboard() {
  const { allowed, checking } = useRequireAuth();
  if (checking) return null;
  if (!allowed) return null; // guard effect 已触发跳转，渲染空避免闪烁
  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-tenant" element={<SelectTenantPage />} />
        <Route element={<AppShell />}>
          <Route index element={<GuardedDashboard />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center">
              <EmptyState title="404" description="页面不存在" />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
