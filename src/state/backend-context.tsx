"use client";

// Backend Context — 运行时后端切换（msw / aspnetcore / springboot / nextjs）。
//
// 设计：
//   - 配置存 localStorage["lab.backend"]（key 常量在 backend-config.ts，bootstrap 期共用）
//   - React 树 mount 时 hydrate 进模块级单例（backend-config.ts）
//   - setBackend / setBaseUrl 同步写单例 + localStorage
//   - 非 msw 后端：fetch 走对应 baseUrl；MSW worker 不启用
//   - msw 后端：fetch 同源，worker 拦截
//   - nextjs 后端：fetch 同源，命中 ../lab-management-system-nextjs 的 API routes
//
// 默认值：msw（dev 下零配置即可跑）。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BACKEND_DEFAULT_BASE_URLS,
  BACKEND_STORAGE_KEY,
  hydrateBackendConfig,
  snapshotBackendConfig,
  type BackendMode,
} from "@/api/backend-config";

const STORAGE_KEY = BACKEND_STORAGE_KEY;

export interface BackendContextValue {
  backend: BackendMode;
  baseUrl: string;
  baseUrls: Record<BackendMode, string>;
  setBackend: (mode: BackendMode) => void;
  setBaseUrl: (mode: BackendMode, url: string) => void;
  resetBaseUrls: () => void;
}

const BackendContext = createContext<BackendContextValue | null>(null);

interface PersistedConfig {
  backend?: BackendMode;
  baseUrls?: Partial<Record<BackendMode, string>>;
}

function loadPersisted(): PersistedConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedConfig;
    return {
      backend: parsed.backend,
      baseUrls: parsed.baseUrls,
    };
  } catch {
    return {};
  }
}

function savePersisted(value: PersistedConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function BackendProvider({ children }: { children: ReactNode }) {
  // 同步从 localStorage hydrate；hydrate 同时把模块级单例（backend-config）也同步刷新，
  // 否则 axios 拦截器拿到的 baseUrl 还是默认 msw
  const initial = (() => {
    const persisted = loadPersisted();
    hydrateBackendConfig(persisted);
    return {
      backend: (persisted.backend ?? "msw") as BackendMode,
      baseUrls: { ...BACKEND_DEFAULT_BASE_URLS, ...(persisted.baseUrls ?? {}) },
    };
  })();

  const [backend, setBackendState] = useState<BackendMode>(initial.backend);
  const [baseUrls, setBaseUrlsState] = useState<Record<BackendMode, string>>(initial.baseUrls);

  const persist = useCallback(
    (next: { backend: BackendMode; baseUrls: Record<BackendMode, string> }) => {
      hydrateBackendConfig(next);
      savePersisted(next);
    },
    [],
  );

  const setBackend = useCallback(
    (mode: BackendMode) => {
      setBackendState(mode);
      persist({ backend: mode, baseUrls });
    },
    [baseUrls, persist],
  );

  const setBaseUrl = useCallback(
    (mode: BackendMode, url: string) => {
      setBaseUrlsState((prev) => {
        const next = { ...prev, [mode]: url };
        persist({ backend, baseUrls: next });
        return next;
      });
    },
    [backend, persist],
  );

  const resetBaseUrls = useCallback(() => {
    setBaseUrlsState(() => {
      const next = { ...BACKEND_DEFAULT_BASE_URLS };
      persist({ backend, baseUrls: next });
      return next;
    });
  }, [backend, persist]);

  // 跨标签页同步：监听 storage 事件，其他标签页切换后端能及时反映
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as PersistedConfig;
        hydrateBackendConfig(parsed);
        if (parsed.backend) setBackendState(parsed.backend);
        if (parsed.baseUrls) setBaseUrlsState({ ...BACKEND_DEFAULT_BASE_URLS, ...parsed.baseUrls });
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<BackendContextValue>(
    () => ({
      backend,
      baseUrl: baseUrls[backend],
      baseUrls,
      setBackend,
      setBaseUrl,
      resetBaseUrls,
    }),
    [backend, baseUrls, setBackend, setBaseUrl, resetBaseUrls],
  );

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("useBackend must be used inside <BackendProvider>");
  return ctx;
}

export { snapshotBackendConfig };
