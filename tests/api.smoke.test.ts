// Smoke test: backend-config（ADR-0012 v0.3.0 + 2026-09-23 用户裁定收窄 ADR-0014）。
// 验证：
//   - getApiBaseUrl / getApiMode 行为正确
//   - mode 命中注册表（三真后端）→ URL 取注册表：mode 是切换把手，registry 是
//     该后端的 URL SSOT；原「baseUrl 直通 env」语义随 ADR-0014 收窄一并退役
//   - 注册表外 mode 原样透传 env（部署期权威缺省保留）
//
// 不启 React、不触 axios；只看 backend-config 模块导出。
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("backend-config (收窄 ADR-0014 — 注册表 + env 缺省)", () => {
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

  it("无 env 时（VITE_* 全 delete） getApiBaseUrl 回退真 nextjs :5201", async () => {
    // beforeEach 删除所有 VITE_* → import.meta.env.VITE_API_BASE_URL === undefined →
    // readEnv 走 fallback 到真 nextjs :5201（2026-09-17 msw 剔除后，3832f0e）。
    // dev（无 .env.local）也是相同路径（Vite 给 "" 默认，
    // 但若 .env 完全没设则是 undefined 走 fallback）。
    stubEnvs({});
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://localhost:5201");
    expect(getApiMode()).toBe("nextjs");
  });

  it("mode=nextjs 命中注册表 → URL 取注册表 :5201（env.baseUrl 不再直通）", async () => {
    stubEnvs({
      VITE_API_BASE_URL: "http://localhost:3001",
      VITE_API_MODE: "nextjs",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://localhost:5201");
    expect(getApiMode()).toBe("nextjs");
  });

  it("mode=springboot 命中注册表 → URL 取注册表 :5205", async () => {
    stubEnvs({
      VITE_API_BASE_URL: "http://localhost:8080",
      VITE_API_MODE: "springboot",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://localhost:5205");
    expect(getApiMode()).toBe("springboot");
  });

  it("注册表外 mode 原样透传 env（部署期权威缺省保留）", async () => {
    stubEnvs({
      VITE_API_BASE_URL: "http://example.internal:9000",
      VITE_API_MODE: "custom-proxy",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("http://example.internal:9000");
    expect(getApiMode()).toBe("custom-proxy");
  });
});
