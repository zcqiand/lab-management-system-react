// 集中读取 import.meta.env.VITE_* 配置 + 默认值。
//
// ADR-0014 — 完全镜像 saas-identity-platform-nextjs：
//   后端塌缩到单 URL + 显示标签。删除 4 槽位 backendBaseUrls +
//   defaultBackend。saas-base-url 保留（lab → saas SSO 跳板仍需独立 env）。
//
// ADR-0012 v0.3.0：删除 enableMsw（MSW Service Worker 模式已删除）。
//
// 规则：
//   - 所有值都有默认值（dev 离线也能跑）
//   - VITE_API_BASE_URL 默认 http://localhost:5173（msw-http，ADR-0012）
//   - 单元测试可通过 vitest 的 import.meta.env stub 注入

export const env = {
  devPort: Number(readEnv("VITE_DEV_PORT", "5173")) || 5173,

  // === 后端（ADR-0014：单 URL + ADR-0012 msw-http 默认）===
  apiBaseUrl: readEnv("VITE_API_BASE_URL", "http://localhost:5173"),
  apiMode: readEnv("VITE_API_MODE", "msw-http"),

  // === saas（SSO 跳板仍需独立 env）===
  saasBaseUrl: readEnv("VITE_SAAS_BASE_URL", "http://localhost:3000"),
} as const;

function readEnv(key: string, fallback: string): string {
  // 区分「未设」(undefined) 和「空串」(explicit empty)：
  //   - 未设 → fallback（dev 默认走 msw-http :5173）
  //   - 空串 → ""（测试 .env.test 用，fetch 走相对 URL，@mswjs/node setupServer 拦截）
  // v0.3.0 之前用 `v.length > 0` 把两者合并，导致 .env.test 的空 baseUrl 被
  // 当成未设，回退到绝对 URL，setupServer handler（用相对路径）不匹配。
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}