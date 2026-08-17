// env 单元测试 — 验证 import.meta.env.VITE_* 注入 + 默认值兜底。
//
// vitest 默认不读 .env.local（.env.test / setup file 另议），所以这里用
// vitest 的 `vi.stubEnv` 注入每个 case 的 env 后 import lib。

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("src/lib/env", () => {
  const original = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // 清理 stub env
    for (const k of Object.keys(import.meta.env)) {
      if (k.startsWith("VITE_")) {
        delete (import.meta.env as Record<string, unknown>)[k];
      }
    }
    Object.assign(import.meta.env, original);
  });

  function stubEnvs(values: Record<string, string>) {
    for (const [k, v] of Object.entries(values)) {
      (import.meta.env as Record<string, string>)[k] = v;
    }
  }

  it("无 VITE_* 时回退默认端口 5173", async () => {
    stubEnvs({});
    const { env } = await import("@/lib/env");
    expect(env.devPort).toBe(5173);
    expect(env.defaultBackend).toBe("msw");
    expect(env.backendBaseUrls.msw).toBe("");
    expect(env.backendBaseUrls.aspnetcore).toBe("http://localhost:5000");
    expect(env.backendBaseUrls.springboot).toBe("http://localhost:8080");
    expect(env.backendBaseUrls.nextjs).toBe("http://localhost:3001");
    expect(env.saasBaseUrl).toBe("http://localhost:3000");
  });

  it("VITE_DEV_PORT 覆盖默认端口", async () => {
    stubEnvs({ VITE_DEV_PORT: "6000" });
    const { env } = await import("@/lib/env");
    expect(env.devPort).toBe(6000);
  });

  it("VITE_DEFAULT_BACKEND 切换到 nextjs", async () => {
    stubEnvs({ VITE_DEFAULT_BACKEND: "nextjs" });
    const { env } = await import("@/lib/env");
    expect(env.defaultBackend).toBe("nextjs");
  });

  it("VITE_BACKEND_URL_ASPNETCORE 覆盖", async () => {
    stubEnvs({ VITE_BACKEND_URL_ASPNETCORE: "https://staging.example.com" });
    const { env } = await import("@/lib/env");
    expect(env.backendBaseUrls.aspnetcore).toBe("https://staging.example.com");
  });

  it("VITE_BACKEND_URL_MSW 空字符串视为未设，回退默认", async () => {
    stubEnvs({ VITE_BACKEND_URL_MSW: "" });
    const { env } = await import("@/lib/env");
    expect(env.backendBaseUrls.msw).toBe("");
  });

  it("VITE_SAAS_BASE_URL 覆盖 saas 地址", async () => {
    stubEnvs({ VITE_SAAS_BASE_URL: "https://idp.staging.example.com" });
    const { env } = await import("@/lib/env");
    expect(env.saasBaseUrl).toBe("https://idp.staging.example.com");
  });
});