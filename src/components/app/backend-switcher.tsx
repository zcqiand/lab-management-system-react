// 运行时后端切换器：msw / aspnetcore / springboot / nextjs
//
// Lab family 比 saas 多一个 nextjs 模式（命中 ../lab-management-system-nextjs 的
// Next.js API routes）。设计沿 saas：dropdown 选，可改 baseUrl。
//
// 本轮仅 sanity demo：放在 App.tsx 顶部，sidebar 留待真业务页面接入。

import { useState } from "react";
import { Server } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackend } from "@/state/backend-context";
import type { BackendMode } from "@/api/backend-config";
import { env } from "@/lib/env";

const LABELS: Record<BackendMode, string> = {
  msw: "MSW（浏览器内 Mock）",
  aspnetcore: "ASP.NET Core",
  springboot: "Spring Boot",
  nextjs: "Next.js API（同仓 / 实验室管理）",
};

const SHORT: Record<BackendMode, string> = {
  msw: "MSW Mock",
  aspnetcore: "ASP.NET Core",
  springboot: "Spring Boot",
  nextjs: "Next.js API",
};

export function BackendSwitcher() {
  const { backend, baseUrls, setBackend, setBaseUrl, resetBaseUrls } = useBackend();
  const [editing, setEditing] = useState<BackendMode | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(mode: BackendMode) {
    setEditing(mode);
    setDraft(baseUrls[mode]);
  }

  function commitEdit() {
    if (editing) {
      const trimmed = draft.trim().replace(/\/+$/, "");
      if (trimmed) setBaseUrl(editing, trimmed);
    }
    setEditing(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="backend-switcher-trigger"
          data-fn="M98.F01.I01"
          className="gap-2"
          title={`当前后端：${LABELS[backend]}`}
        >
          <Server className="h-4 w-4" />
          {SHORT[backend]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>后端模式（运行时切换）</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(LABELS) as BackendMode[]).map((mode) => {
          const active = mode === backend;
          return (
            <DropdownMenuItem
              key={mode}
              onSelect={(e) => {
                e.preventDefault();
                setBackend(mode);
              }}
              data-testid={`backend-option-${mode}`}
              className={active ? "bg-accent" : ""}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{LABELS[mode]}</div>
                <div className="font-mono text-xs text-muted-foreground truncate">
                  {baseUrls[mode] || "(同源)"}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          自定义 baseUrl
        </DropdownMenuLabel>
        <div className="px-2 pb-2 space-y-2">
          {editing ? (
            <div className="space-y-2">
              <div className="text-xs font-medium">{LABELS[editing]}</div>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={env.backendBaseUrls[editing] || "http://localhost:5000"}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditing(null);
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  取消
                </Button>
                <Button size="sm" onClick={commitEdit}>
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {(Object.keys(LABELS) as BackendMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => startEdit(mode)}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent"
                >
                  <span className="font-medium">{LABELS[mode]}</span>
                  <span className="ml-2 font-mono text-muted-foreground">
                    {baseUrls[mode] || "(空 / 同源)"}
                  </span>
                </button>
              ))}
              <button
                onClick={() => resetBaseUrls()}
                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
              >
                恢复默认 baseUrl
              </button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
