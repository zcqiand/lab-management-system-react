// Runtime backend-switching singleton (module-level, not Context).
// Lab family: msw / aspnetcore / springboot / nextjs 四模式运行时切换，不进 env / vite proxy。
// React Context 只是它的视图层：mount 时 hydrate，change 时 snapshot 写 localStorage。

export type BackendMode = "msw" | "aspnetcore" | "springboot" | "nextjs";

const DEFAULT_BASE_URLS: Readonly<Record<BackendMode, string>> = {
  msw: "", // 同源，service worker 拦截
  aspnetcore: "http://localhost:5000",
  springboot: "http://localhost:8080",
  nextjs: "", // 同源，lab-management-system-nextjs 的 Next.js API routes
};

let currentBackend: BackendMode = "msw";
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
