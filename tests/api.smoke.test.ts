// Smoke test: backend-config env-driven 单 URL（ADR-0014）。验证：
//   - getApiBaseUrl / getApiMode / isMswEnabled 行为正确
//   - 单 URL 模式不再有 4-backend 切换
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

  it("无 env 时 getApiBaseUrl 回退空串（同源）", async () => {
    stubEnvs({});
    const { getApiBaseUrl, getApiMode, isMswEnabled } = await import(
      "@/api/backend-config"
    );
    expect(getApiBaseUrl()).toBe("");
    expect(getApiMode()).toBe("msw");
    expect(isMswEnabled()).toBe(true);
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

  it("VITE_ENABLE_MSW=false → isMswEnabled=false（fetch 直走真后端）", async () => {
    stubEnvs({ VITE_ENABLE_MSW: "false" });
    const { isMswEnabled } = await import("@/api/backend-config");
    expect(isMswEnabled()).toBe(false);
  });

  it("VITE_API_BASE_URL=空串 → getApiBaseUrl 仍回退空串（同源）", async () => {
    stubEnvs({ VITE_API_BASE_URL: "" });
    const { getApiBaseUrl } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("");
  });
});