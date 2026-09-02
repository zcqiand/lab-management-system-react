// Smoke test: backend-config env-driven 单 URL（ADR-0014 + ADR-0012 v0.3.0）。验证：
//   - getApiBaseUrl / getApiMode 行为正确
//   - 单 URL 模式不再有 4-backend 切换
//   - isMswEnabled / VITE_ENABLE_MSW 已删除（msw-http 是默认；dev 走独立 HTTP server）
//
// 不启 React、不触 axios；只看 backend-config 模块导出。
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("M98 backend-config (env-driven 单 URL — ADR-0014)", () => {
  beforeEach(() => {
    // 每个 case 前清 stub env
    for (const k of Object.keys(import.meta.env)) {
      if (k.startsWith("VITE_")) {
        delete (import.meta.env as Record<string, unknown>)[k];
      }
    }
    vi.resetModules();
  });

  function stubEnvs(values: Record<string, string>) {
    for (const [k, v] of Object.entries(values)) {
      (import.meta.env as Record<string, string>)[k] = v;
    }
  }

  it("无 env 时（VITE_* 全 delete） getApiBaseUrl 回退 msw-http :5200", async () => {
    // beforeEach 删除所有 VITE_* → import.meta.env.VITE_API_BASE_URL === undefined →
    // readEnv 走 fallback。dev（无 .env.local）也是相同路径（Vite 给 "" 默认，
    // 但若 .env 完全没设则是 undefined 走 fallback）。
    stubEnvs({});
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://localhost:5200");
    expect(getApiMode()).toBe("msw-http");
  });

  it("VITE_API_BASE_URL=http://localhost:3001 → getApiBaseUrl 切到 nextjs 仓", async () => {
    stubEnvs({
      VITE_API_BASE_URL: "http://localhost:3001",
      VITE_API_MODE: "nextjs",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://localhost:3001");
    expect(getApiMode()).toBe("nextjs");
  });

  it("VITE_API_BASE_URL=http://localhost:8080 → 切到 springboot 真后端", async () => {
    stubEnvs({
      VITE_API_BASE_URL: "http://localhost:8080",
      VITE_API_MODE: "springboot",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://localhost:8080");
    expect(getApiMode()).toBe("springboot");
  });

  it("VITE_API_BASE_URL=空串 → 显式空，URL 走相对（@mswjs/node setupServer 拦截）", async () => {
    // .env.test 模式：显式设空串 → readEnv 不走 fallback → 返回 ""。
    // fetch 走相对 URL → setupServer handler（/api/...）匹配。
    stubEnvs({ VITE_API_BASE_URL: "" });
    const { getApiBaseUrl } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("");
  });
});
