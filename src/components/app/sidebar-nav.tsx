// SidebarNav — 侧边导航原语。菜单项数据源由消费方传入（Sprint 2 接 GET /auth/menus）。

import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  /** 路由项：站内路径 */
  path?: string;
  /** 动作项（如退出登录）：由消费方注入 onAction */
  action?: string;
  /** 图标 key（icons 表由消费方传入，避免组件库绑死 lucide 全集） */
  icon?: string;
}

export interface SidebarNavProps {
  items: NavItem[];
  icons?: Record<string, ReactNode>;
  onAction?: (action: string) => void;
}

export function SidebarNav({ items, icons, onAction }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) =>
        item.path ? (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground",
              )
            }
          >
            {item.icon ? icons?.[item.icon] : null}
            {item.label}
          </NavLink>
        ) : (
          <button
            key={item.label}
            type="button"
            onClick={() => item.action && onAction?.(item.action)}
            className="text-muted-foreground hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            {item.icon ? icons?.[item.icon] : null}
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
