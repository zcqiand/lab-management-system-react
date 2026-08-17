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
