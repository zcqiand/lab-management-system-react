// SidebarNav — nextjs 仓 sidebar-nav.tsx 的镜像（Sprint 2 Batch 0）。
//
// 与 nextjs 版的差异（镜像改造点）：
//   - 菜单数据源：lab 后端 /api/auth/menus（orval authGetMenus + Bearer lab
//     JWT；springboot 侧 saas 快照缓存 → demo 兜底）；失败回退静态 MENU_TREE
//   - next/navigation 的 usePathname/useRouter/useSearchParams →
//     react-router-dom 的 useLocation/useNavigate；?menu= 机制不搬，
//     选中态按 location.pathname 匹配
//   - useSaasApp 删（appName 静态传入）
// 保留：收起/展开 + localStorage 持久化（sidebar.collapsed.<appCode> /
// sidebar.groups.<appCode>）、分组树递归、ICON_MAP、data-fn 锚点。

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Beaker,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  PackageSearch,
  ScrollText,
  Settings,
  Shield,
  TestTube2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { authGetMenus } from "@/api/endpoints/endpoints";
import type { MenuNode as ContractMenuNode } from "@/api/endpoints/endpoints.schemas";

// 与 saas 的 EffectiveMenuNode 对齐（手写，避免跨仓依赖）
interface MenuNode {
  id: string;
  appId: string;
  parentId?: string;
  code: string;
  name: string;
  path?: string;
  icon?: string;
  type: "group" | "page" | "action";
  sortOrder: number;
  children: MenuNode[];
}

export type { MenuNode };

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FlaskConical,
  TestTube2,
  Beaker,
  ClipboardList,
  FileText,
  ScrollText,
  Shield,
  Wrench,
  Settings,
  PackageSearch,
  Database,
  Activity,
  ListChecks,
};

function Icon({ name }: { name?: string }) {
  const C = name ? ICON_MAP[name] : undefined;
  if (!C) return <span className="h-4 w-4 inline-block" aria-hidden />;
  return <C className="h-4 w-4" />;
}

interface SidebarNavProps {
  /** 菜单树。null 表示还在加载或拉取失败（消费方应传 fallback 静态 MENU_TREE）。
   *  useBackendMenus 拿到数据前 menus=null，sidebar 渲染空状态。 */
  menus: MenuNode[] | null;
  appCode: string;
  appName?: string | null;
  /** Sidebar 底部主操作（如登出按钮） */
  footerAction?: React.ReactNode;
  /** 次要操作（如后端模式切换器） */
  footerExtras?: React.ReactNode;
  version?: string;
}

export function SidebarNav({
  menus,
  appCode,
  appName,
  footerAction,
  footerExtras,
  version = "lab-management-system-react",
}: SidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // 选中态：按 pathname 前缀匹配（"/models/xxx" 也选中 m-models）。
  // menus=null 时（saas 拉取失败或加载中）跳过匹配，让 router 重定向去 /login。
  const selectedCode = (() => {
    if (!menus) return null;
    for (const g of menus) {
      for (const leaf of g.children) {
        if (!leaf.path) continue;
        if (pathname === `/${leaf.path}` || pathname.startsWith(`/${leaf.path}/`)) return leaf.code;
      }
      if (pathname === "/" && g.children.some((c) => c.path === "")) {
        return g.children.find((c) => c.path === "")?.code ?? null;
      }
    }
    return null;
  })();

  // 全局收起/展开：状态持久化到 localStorage（按 appCode 区分），刷新保留
  const SIDEBAR_KEY = `sidebar.collapsed.${appCode}`;
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(SIDEBAR_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* 无 storage 时忽略 */
    }
    setHydrated(true);
  }, [SIDEBAR_KEY]);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  // 防止首帧闪烁：未水合前按展开渲染
  const effectiveCollapsed = hydrated ? collapsed : false;

  // 分组收起/展开：每个 group code 一项，按 appCode 持久化到 JSON 字符串
  // 仅在 sidebar 展开态生效（icon-only 模式全部铺开，看不到分组 toggle 的意义）
  const GROUPS_KEY = `sidebar.groups.${appCode}`;
  const [groupCollapsed, setGroupCollapsed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GROUPS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr))
          setGroupCollapsed(new Set(arr.filter((x): x is string => typeof x === "string")));
      }
    } catch {
      /* ignore */
    }
  }, [GROUPS_KEY]);
  const toggleGroup = (code: string) => {
    setGroupCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      try {
        window.localStorage.setItem(GROUPS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "shrink-0 bg-slate-900 text-white flex flex-col transition-[width] duration-200",
        effectiveCollapsed ? "w-14" : "w-60",
      )}
      data-collapsed={effectiveCollapsed}
      data-fn="M01.F04.I01"
      data-testid="sidebar-nav"
      aria-label="主导航"
    >
      <div
        className={cn(
          "flex items-center py-4 border-b border-white/10",
          effectiveCollapsed ? "px-2 justify-center" : "px-5",
        )}
      >
        <div className={cn("flex items-center gap-2", effectiveCollapsed && "justify-center")}>
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
            L
          </div>
          {!effectiveCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate" data-testid="sidebar-app-name">
                {appName ?? "Lab-Management"}
              </h1>
              <p className="text-xs text-white/50 truncate">appCode = {appCode}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={effectiveCollapsed ? "展开菜单" : "收起菜单"}
          aria-label={effectiveCollapsed ? "展开菜单" : "收起菜单"}
          aria-expanded={!effectiveCollapsed}
          className={cn(
            "shrink-0 ml-auto h-7 w-7 rounded inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10",
            effectiveCollapsed && "ml-0",
          )}
          data-testid="sidebar-toggle"
        >
          {effectiveCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto" aria-label="菜单树">
        {!menus ? (
          <p
            className={cn("text-xs text-white/40", effectiveCollapsed ? "text-center" : "px-3")}
            data-testid="sidebar-menus-loading"
          >
            {effectiveCollapsed ? "…" : "（菜单加载中）"}
          </p>
        ) : menus.length === 0 ? (
          <p className={cn("text-xs text-white/40", effectiveCollapsed ? "text-center" : "px-3")}>
            {effectiveCollapsed ? "—" : "（无菜单）"}
          </p>
        ) : (
          menus.map((node) => (
            <NavLeaf
              key={node.id}
              node={node}
              depth={0}
              pathname={pathname}
              selected={selectedCode}
              collapsed={effectiveCollapsed}
              groupCollapsed={effectiveCollapsed ? new Set<string>() : groupCollapsed}
              onToggleGroup={effectiveCollapsed ? () => undefined : toggleGroup}
              onSelect={(path) => {
                // 叶子节点（有 path）→ 跳 /<path>；group 节点无 onSelect
                if (path !== undefined) navigate(`/${path}`);
              }}
            />
          ))
        )}
      </nav>
      <Separator className="bg-white/10" />
      <div
        className={cn(
          "space-y-2",
          effectiveCollapsed ? "p-2 flex flex-col items-center" : "p-3",
        )}
      >
        {footerAction}
        {footerExtras}
        {version && (
          <div
            className={cn(
              "text-xs text-white/40 truncate",
              effectiveCollapsed ? "text-[10px] text-center" : "px-2",
            )}
          >
            {effectiveCollapsed ? "v" : version}
          </div>
        )}
      </div>
    </aside>
  );
}

function NavLeaf({
  node,
  depth,
  pathname,
  selected,
  collapsed,
  groupCollapsed,
  onToggleGroup,
  onSelect,
}: {
  node: MenuNode;
  depth: number;
  pathname: string;
  selected: string | null;
  collapsed: boolean;
  groupCollapsed: Set<string>;
  onToggleGroup: (code: string) => void;
  onSelect: (path: string | undefined) => void;
}) {
  void pathname; // 镜像保留参数（nextjs 版有），react 选中态已上提到 SidebarNav 计算
  const isLeaf = node.children.length === 0;
  const isSelected = selected === node.code;

  // group 节点：分区标题（可点击收/展）+ 子项列表
  if (!isLeaf) {
    const isGroupCollapsed = groupCollapsed.has(node.code);
    const childCount = node.children.length;
    const showHeaderButton = !collapsed; // 仅展开态有可点击的 header
    return (
      <div
        className="mb-3"
        data-testid={`sidebar-group-${node.code}`}
        data-group-collapsed={isGroupCollapsed}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 border-t border-white/5 first:border-t-0",
            collapsed ? "justify-center px-0 pt-3 pb-1" : "px-3 pt-3 pb-1",
          )}
        >
          {!showHeaderButton ? (
            // icon-only 模式：只有图标，hover title 提示整组（连子项）
            <span title={`${node.name} · ${childCount} 项`}>
              <Icon name={node.icon} />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onToggleGroup(node.code)}
              title={isGroupCollapsed ? `展开「${node.name}」` : `收起「${node.name}」`}
              aria-label={isGroupCollapsed ? `展开「${node.name}」` : `收起「${node.name}」`}
              aria-expanded={!isGroupCollapsed}
              className="flex items-center gap-1.5 hover:text-white/80 transition-colors text-left flex-1 min-w-0"
              data-testid={`sidebar-group-toggle-${node.code}`}
            >
              <Icon name={node.icon} />
              <span className="truncate">{node.name}</span>
              <span className="ml-auto inline-flex items-center text-white/30">
                <span className="text-[9px] tabular-nums mr-1">{childCount}</span>
                <ChevronToggle expanded={!isGroupCollapsed} />
              </span>
            </button>
          )}
        </div>
        {!isGroupCollapsed && (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <NavLeaf
                key={child.id}
                node={child}
                depth={depth + 1}
                pathname={pathname}
                selected={selected}
                collapsed={collapsed}
                groupCollapsed={groupCollapsed}
                onToggleGroup={onToggleGroup}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // leaf 节点（page / action）：button，深层时缩进 + 左侧 connector
  return (
    <div
      className="relative"
      style={{ marginLeft: !collapsed && depth > 0 ? `${depth * 0.875}rem` : 0 }}
    >
      {depth > 0 && !collapsed && (
        <div aria-hidden className="absolute left-3 top-0 bottom-0 w-px bg-white/10" />
      )}
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        disabled={!node.path && node.path !== ""}
        data-fn={`M98.F04.${node.code}`}
        data-testid={`sidebar-item-${node.code}`}
        title={collapsed ? node.name : undefined}
        aria-label={collapsed ? node.name : undefined}
        className={cn(
          "relative w-full text-left flex items-center gap-2 rounded text-sm transition-colors",
          collapsed ? "justify-center px-0 py-2" : "px-3 py-1.5",
          isSelected ? "bg-slate-700 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
          !node.path && node.path !== "" && "opacity-50 cursor-not-allowed",
        )}
      >
        <Icon name={node.icon} />
        {!collapsed && <span className="truncate">{node.name}</span>}
      </button>
    </div>
  );
}

/** 分组 header 用的 chevron 指示器 */
function ChevronToggle({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={cn("transition-transform duration-150", expanded ? "rotate-0" : "-rotate-90")}
    >
      <path
        d="M2 3.5 L5 7 L8 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SAAS_APP_CODE = "lab-management";

/**
 * 客户端 hook：拉后端 `GET /api/auth/menus`（orval authGetMenus，axios 拦截器
 * 自动注 baseURL + Bearer lab JWT）。后端数据链（lab-springboot v0.1.7 起）：
 * SSO/refresh 时缓存的 saas 菜单快照 → miss 回退 demo 菜单，端点永不 5xx。
 *
 * 契约 MenuNode{id,label,path?,icon?,children?} 在此适配成本地渲染 MenuNode
 * （name/code/type/sortOrder），menus.ts 静态树与渲染层零改动。
 * 失败返 null，消费方回退静态 MENU_TREE。 */
export function useBackendMenus(): {
  data: MenuNode[] | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<MenuNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authGetMenus()
      .then((resp) => {
        if (cancelled) return;
        setData(resp.data.map(adaptContractMenu));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

/** 契约 MenuNode（shared tsp：id/label/path?/icon?/children?）→ 本地渲染 MenuNode。 */
function adaptContractMenu(node: ContractMenuNode, index: number): MenuNode {
  const children = node.children ?? [];
  return {
    id: node.id,
    appId: SAAS_APP_CODE,
    code: node.id,
    name: node.label,
    path: node.path,
    icon: node.icon,
    // 契约无 type 字段：有子节点即 group，否则 page
    type: children.length > 0 ? "group" : "page",
    sortOrder: index + 1,
    children: children.map(adaptContractMenu),
  };
}
