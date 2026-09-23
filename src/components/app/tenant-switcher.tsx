// TenantSwitcher（M00.F02.I01）— header 右侧租户切换下拉。镜像 lab-nextjs
// tenant-switcher.tsx（视觉：Building2 + ChevronsUpDown），数据与切换语义镜像
// lab-management-system-vue TenantSwitcher.vue：
//   - 候选清单来自 auth 模块 sessionTenantsList()（settleLogin/hydrateAuth 同步）；
//   - 切换走契约 POST /api/auth/switch-tenant → 后端换发新 tenant claim 的
//     HS256 token，会话不中断；
//   - 成功后整页刷新（react-query 缓存按旧租户 bake，跨租户不通用；AppShell
//     传 onSwitched，组件默认也落刷新，测试可注入桩）。
// 错误就地展示在触发器下方：radix 点选菜单项即关菜单，错误若渲染在 content
// 里会随菜单卸载而不可见（本仓 Toaster 未挂载，sonner 不可用）。

import { useState } from "react";
import { Building2, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isErrorResponse, sessionTenantsList, useAuth } from "@/state/auth-context";

function defaultReload(): void {
  window.location.reload();
}

export function TenantSwitcher({
  onSwitched = defaultReload,
}: {
  /** 切换成功回调（AppShell 传整页刷新；测试注桩） */
  onSwitched?: () => void;
}) {
  const { state, switchTenant } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const current = state.kind === "authenticated" ? state.value.tenant : null;
  const tenants = sessionTenantsList();

  async function onSwitch(tenantId: string): Promise<void> {
    if (pending) return;
    if (current && tenantId === current.tenantId) return;
    setPending(true);
    setError("");
    const resp = await switchTenant({ tenantId });
    setPending(false);
    if (isErrorResponse(resp)) {
      // toApiError 走 axios error message（含状态码，如 "Request failed with
      // status code 404"），404=目标租户不存在或非成员
      setError(
        resp.message.includes("404")
          ? "该租户不存在或你不是其成员"
          : `切换失败：${resp.message}`,
      );
      return;
    }
    onSwitched();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="tenant-switcher"
            data-fn="M00.F02.I01"
            title={current ? current.name : "选择租户"}
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="max-w-40 truncate font-medium">
              {current ? current.name : "选择租户"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>切换租户</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((t) => (
            <DropdownMenuItem
              key={t.tenantId}
              data-testid={`tenant-option-${t.tenantId}`}
              className="cursor-pointer"
              onSelect={() => void onSwitch(t.tenantId)}
            >
              <Building2 className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{t.name}</span>
                <span className="truncate font-mono text-xs text-slate-500">
                  {t.code}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="text-xs text-destructive" data-testid="tenant-switcher-error">
          {error}
        </p>
      )}
    </div>
  );
}
