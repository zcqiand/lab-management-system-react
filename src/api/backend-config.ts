// 后端配置：env 缺省 + localStorage 覆盖的运行时后端选择。
//
// ADR-0014（2026-09）曾把 4-backend 运行时切换塌缩成 env 单 URL（BackendBadge
// 仅诊断显示）。2026-09-23 用户裁定收窄该决策：侧栏底部恢复后端切换器
//（BackendSwitcher），dev/书稿演示需要在一套前端下对比三个真后端。
// 镜像 lab-management-system-vue src/api/backend-config.ts（同日同裁定）。
//
// 语义：
//   - KNOWN_BACKENDS 是唯一合法后端集合（msw 仓 2026-09-17 已删，不在列）；
//   - 覆盖持久化在 localStorage（lab.backend.override = mode），读不到/非法时
//     回落 env（VITE_API_BASE_URL / VITE_API_MODE）——env 仍是部署期权威缺省；
//   - 切换由 BackendSwitcher 负责：写覆盖 + 清本机会话（跨后端 token 不通用，
//     陈旧 token 会 401）+ 整页刷新，见 state/auth-context.tsx clearPersistedSession。
//
// 读取必须惰性 + try/catch：本模块被 node 测试环境（无 window）与浏览器共用。

import { env } from "@/lib/env";

export type BackendMode = "nextjs" | "aspnetcore" | "springboot";

export interface BackendEntry {
  mode: BackendMode;
  label: string;
  baseUrl: string;
}

/** 家族三真后端（端口 SSOT：multi-repo-family.md §6，5200 段 = lab） */
export const KNOWN_BACKENDS: BackendEntry[] = [
  { mode: "nextjs", label: "Next.js API", baseUrl: "http://localhost:5201" },
  { mode: "aspnetcore", label: "ASP.NET Core", baseUrl: "http://localhost:5204" },
  { mode: "springboot", label: "Spring Boot", baseUrl: "http://localhost:5205" },
];

const OVERRIDE_KEY = "lab.backend.override";

function readOverride(): BackendMode | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    return KNOWN_BACKENDS.some((b) => b.mode === raw) ? (raw as BackendMode) : null;
  } catch {
    return null;
  }
}

/** 当前活动后端：localStorage 覆盖优先，否则 env 派生（注册表外 env 值原样透传） */
export function getActiveBackend(): BackendEntry {
  const override = readOverride();
  if (override) {
    return KNOWN_BACKENDS.find((b) => b.mode === override)!;
  }
  const byEnv = KNOWN_BACKENDS.find((b) => b.mode === env.apiMode);
  if (byEnv) return byEnv;
  return {
    mode: env.apiMode as BackendMode,
    label: env.apiMode,
    baseUrl: env.apiBaseUrl,
  };
}

export function getApiBaseUrl(): string {
  return getActiveBackend().baseUrl;
}

export function getApiMode(): string {
  return getActiveBackend().mode;
}

/** 写运行时覆盖；注册表外 mode 直接 throw（防脏值静默失效） */
export function setBackendOverride(mode: BackendMode): void {
  const hit = KNOWN_BACKENDS.find((b) => b.mode === mode);
  if (!hit) throw new Error(`unknown backend mode: ${mode}`);
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(OVERRIDE_KEY, mode);
}

export function clearBackendOverride(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}
