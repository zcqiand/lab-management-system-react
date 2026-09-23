// BackendSwitcher — 侧栏底部运行时选择 lab 家族三真后端（msw 仓 2026-09-17 已删）。
//
// 2026-09-23 用户裁定收窄 ADR-0014：恢复后端切换器（BackendBadge 退役），
// dev/书稿演示需要在一套前端下对比三个真后端。镜像 lab-management-system-vue
// BackendSwitcher.vue，落位在侧栏 footer（深色底，trigger 用 ghost + white/70 适配）。
//
// 切换语义（backend-config.ts）：写 localStorage 覆盖 → 清本机会话
//（跨后端 token 不通用，陈旧 token 401）→ 整页刷新拉新后端数据。

import { useState } from "react";
import { ChevronsUpDown, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  KNOWN_BACKENDS,
  getActiveBackend,
  setBackendOverride,
  type BackendMode,
} from "@/api/backend-config";
import { clearPersistedSession } from "@/state/auth-context";

export function BackendSwitcher() {
  // 挂载时读一次即可：整页刷新是切换的唯一出口，不存在运行中变位
  const [active] = useState(() => getActiveBackend());
  const [switching, setSwitching] = useState(false);

  function onPick(mode: BackendMode): void {
    if (mode === active.mode || switching) return;
    setSwitching(true);
    setBackendOverride(mode);
    clearPersistedSession();
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          data-testid="backend-switcher-trigger"
          title={`当前后端：${active.label} · ${active.baseUrl}`}
        >
          <Server className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono">{active.mode}</span>
          <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-64">
        <DropdownMenuLabel>后端（运行时切换）</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {KNOWN_BACKENDS.map((b) => (
          <DropdownMenuItem
            key={b.mode}
            data-testid={`backend-option-${b.mode}`}
            className={cn(b.mode === active.mode ? "bg-accent" : "cursor-pointer")}
            onSelect={() => onPick(b.mode)}
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">{b.label}</span>
              <span className="truncate font-mono text-xs text-slate-500">
                {b.baseUrl}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
