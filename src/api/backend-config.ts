// Runtime backend-switching singleton (module-level, not Context).
// Lab family: msw / aspnetcore / springboot / nextjs 四模式运行时切换。
// 默认 baseUrl 走 src/lib/env.ts（VITE_BACKEND_URL_* 注入，无 env 时回退 localhost:5000/8080）。
// React Context 只是它的视图层：mount 时 hydrate，change 时 snapshot 写 localStorage。
// 契约：BackendId 来自 shared frontend-bind.tsp（src/api/contracts.ts re-export）。

import type { BackendId } from "@/api/contracts";
import { env } from "@/lib/env";

/** 旧名兼容别名 — 契约正名是 BackendId */
export type BackendMode = BackendId;

const DEFAULT_BASE_URLS: Readonly<Record<BackendMode, string>> = {
  msw: env.backendBaseUrls.msw, // 同源（service worker 拦截）或 VITE_BACKEND_URL_MSW
  nextjs: env.backendBaseUrls.nextjs, // 同源（Next.js API routes）或 VITE_BACKEND_URL_NEXTJS
  aspnetcore: env.backendBaseUrls.aspnetcore, // VITE_BACKEND_URL_ASPNETCORE
  springboot: env.backendBaseUrls.springboot, // VITE_BACKEND_URL_SPRINGBOOT
};

let currentBackend: BackendMode = env.defaultBackend as BackendMode;
let baseUrls: Record<BackendMode, string> = { ...DEFAULT_BASE_URLS };

export function getBackend(): BackendMode {
  return currentBackend;
}

/** localStorage 持久化 key — backend-context 与 bootstrap 期 hydrate 共用 */
export const BACKEND_STORAGE_KEY = "lab.backend";

/**
 * bootstrap 期（React mount 前）从 localStorage 同步 hydrate 单例。
 * 必须在 enableMocking() 之前调：否则 getBackend() 还是 env 默认 msw，
 * 已切到 aspnetcore/springboot 的用户 reload 后 SW 被错误地重新注册，
 * /api/* 乃至页面导航全被 mockServiceWorker.js 拦截。
 * Provider mount 时的 hydrateBackendConfig 仍保留（同一 key，幂等）。
 */
export function hydrateBackendFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(BACKEND_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      backend?: BackendMode;
      baseUrls?: Partial<Record<BackendMode, string>>;
    };
    hydrateBackendConfig(parsed);
  } catch {
    /* 损坏的持久化值忽略，保持 env 默认 */
  }
}
export function setBackend(mode: BackendMode): void {
  currentBackend = mode;
}
export function getBaseUrl(): string {
  return baseUrls[currentBackend];
}
export function getBaseUrlFor(mode: BackendMode): string {
  return baseUrls[mode];
}
export function setBaseUrlFor(mode: BackendMode, url: string): void {
  baseUrls[mode] = url;
}

/** hydrate from localStorage — React Context 在 mount 时调用 */
export function hydrateBackendConfig(persisted: {
  backend?: BackendMode;
  baseUrls?: Partial<Record<BackendMode, string>>;
}): void {
  if (persisted.backend) currentBackend = persisted.backend;
  if (persisted.baseUrls) baseUrls = { ...baseUrls, ...persisted.baseUrls };
}

/** 单一真相快照 — 写 localStorage 用 */
export function snapshotBackendConfig(): {
  backend: BackendMode;
  baseUrls: Record<BackendMode, string>;
} {
  return { backend: currentBackend, baseUrls: { ...baseUrls } };
}

export const BACKEND_DEFAULT_BASE_URLS = DEFAULT_BASE_URLS;
