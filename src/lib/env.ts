// 集中读取 import.meta.env.VITE_* 配置 + 默认值。
//
// 规则：
//   - 所有值都有默认值（dev 离线也能跑）
//   - VITE_BACKEND_URL_* 空串 = 同源（msw / nextjs 默认）
//   - 单元测试可通过 vitest 的 import.meta.env stub 注入

type BackendId = "msw" | "nextjs" | "aspnetcore" | "springboot";

const readEnv = (key: string, fallback: string): string => {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
};

export const env = {
  devPort: Number(readEnv("VITE_DEV_PORT", "5173")) || 5173,
  defaultBackend: readEnv("VITE_DEFAULT_BACKEND", "msw") as BackendId,
  backendBaseUrls: {
    msw: readEnv("VITE_BACKEND_URL_MSW", ""),
    nextjs: readEnv("VITE_BACKEND_URL_NEXTJS", ""),
    aspnetcore: readEnv("VITE_BACKEND_URL_ASPNETCORE", "http://localhost:5000"),
    springboot: readEnv("VITE_BACKEND_URL_SPRINGBOOT", "http://localhost:8080"),
  } as Record<BackendId, string>,
  saasBaseUrl: readEnv("VITE_SAAS_BASE_URL", "http://localhost:3000"),
} as const;