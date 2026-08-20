// 集中读取 import.meta.env.VITE_* 配置 + 默认值。
//
// ADR-0014 — 完全镜像 saas-identity-platform-nextjs：
//   后端塌缩到单 URL + MSW 开关 + 显示标签。删除 4 槽位 backendBaseUrls +
//   defaultBackend。saas-base-url 保留（lab → saas SSO 跳板仍需独立 env）。
//
// 规则：
//   - 所有值都有默认值（dev 离线也能跑）
//   - VITE_API_BASE_URL 空串 = 同源（被 MSW 拦截；或同仓 Route Handler / mock）
//   - 单元测试可通过 vitest 的 import.meta.env stub 注入

export const env = {
  devPort: Number(readEnv("VITE_DEV_PORT", "5173")) || 5173,

  // === 后端（ADR-0014：单 URL）===
  apiBaseUrl: readEnv("VITE_API_BASE_URL", ""),
  enableMsw:
    import.meta.env.VITE_ENABLE_MSW !== undefined
      ? import.meta.env.VITE_ENABLE_MSW === "true"
      : import.meta.env.MODE !== "production",
  apiMode: readEnv("VITE_API_MODE", "msw"),

  // === saas（SSO 跳板仍需独立 env）===
  saasBaseUrl: readEnv("VITE_SAAS_BASE_URL", "http://localhost:3000"),
} as const;

function readEnv(key: string, fallback: string): string {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}