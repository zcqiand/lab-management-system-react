// 后端配置：env-driven 单 URL（ADR-0014 — 完全镜像 saas-identity-platform-nextjs）。
//
// 旧 4-backend 运行时切换（msw / nextjs / aspnetcore / springboot）+ localStorage 持久化
// + 模块单例 + Context 已废弃。改用：
//
//   VITE_API_BASE_URL    后端 base URL（默认 "" = 同源）
//   VITE_API_MODE        显示标签（默认 "msw-http"），仅 UI 显示
//
// ADR-0012 v0.3.0：Service Worker 模式完全删除。dev 路径只走 msw-http
//（独立 HTTP server，由 @lab/management-system-msw/src/server.ts 起在 :5200）；
// *_ENABLE_MSW env 与 isMswEnabled() 函数一并删除（MSW 启动不再由 env 门控）。
//
// 所有调用方从 `getBaseUrl()` / `getBackend()` 切到 `getApiBaseUrl()` / `getApiMode()`。

import { env } from "@/lib/env";

export function getApiBaseUrl(): string {
  // 直接返回 env.apiBaseUrl：默认值在 env.ts；.env.test 设 VITE_API_BASE_URL= 显式
  // 空串 → 返回 "" → fetch 相对 URL → @mswjs/node setupServer handler（/api/...）匹配。
  // dev 走 .env.example 的 http://localhost:5200 msw-http 默认值。
  return env.apiBaseUrl;
}

export function getApiMode(): string {
  return env.apiMode;
}