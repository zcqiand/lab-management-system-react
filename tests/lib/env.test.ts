// env 单元测试 — 验证 import.meta.env.VITE_* 注入 + 默认值兜底（ADR-0014 + ADR-0012 v0.3.0）。
//
// vitest 默认不读 .env.local（.env.test / setup file 另议），所以这里用
// vitest 的 `vi.stubEnv` 注入每个 case 的 env 后 import lib。
//
// ADR-0012 v0.3.0：删除 VITE_ENABLE_MSW / enableMsw 相关测试（Service Worker 模式已删除）。

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("src/lib/env", () => {
  beforeEach(() => {
    // 完全清理 VITE_* env（不只 resetModules）—— 模拟 dev 无 .env.local /
    // .env.test 设 VITE_API_BASE_URL= 的真实环境：
    //   - delete 后 → undefined → readEnv 走 fallback
    //   - stub "" → 显式空 → readEnv 返回 ""（不走 fallback）
    for (const k of Object.keys(import.meta.env)) {
      if (k.startsWith("VITE_")) {
        delete (import.meta.env as Record<string, unknown>)[k];
      }
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const k of Object.keys(import.meta.env)) {
      if (k.startsWith("VITE_")) {
        delete (import.meta.env as Record<string, unknown>)[k];
      }
    }
  });

  function stubEnvs(values: Record<string, string>) {
    for (const [k, v] of Object.entries(values)) {
      (import.meta.env as Record<string, string>)[k] = v;
    }
  }

  it("无 VITE_* 时回退默认端口 5202 + msw-http :5200 + msw-http 模式", async () => {
    // beforeEach 删除所有 VITE_* → import.meta.env.VITE_API_BASE_URL === undefined →
    // readEnv 走 fallback 到 msw-http :5200。dev（无 .env.local）走相同路径。
    stubEnvs({});
    const { env } = await import("@/lib/env");
    expect(env.devPort).toBe(5202);
    expect(env.apiBaseUrl).toBe("http://localhost:5200");
    expect(env.apiMode).toBe("msw-http");
    expect(env.saasBaseUrl).toBe("http://localhost:5101");
  });

  it("VITE_DEV_PORT 覆盖默认端口", async () => {
    stubEnvs({ VITE_DEV_PORT: "6000" });
    const { env } = await import("@/lib/env");
    expect(env.devPort).toBe(6000);
  });

  it("VITE_API_BASE_URL 切到外部后端", async () => {
    stubEnvs({ VITE_API_BASE_URL: "http://localhost:3001" });
    const { env } = await import("@/lib/env");
    expect(env.apiBaseUrl).toBe("http://localhost:3001");
  });

  it("VITE_API_BASE_URL 空字符串保留为 \"\"（不走 fallback）", async () => {
    // ADR-0012 v0.3.0：readEnv 区分 undefined vs ""，空字符串保留供 .env.test
    // 用（相对 URL + @mswjs/node setupServer）。
    stubEnvs({ VITE_API_BASE_URL: "" });
    const { env } = await import("@/lib/env");
    expect(env.apiBaseUrl).toBe("");
  });

  it("VITE_API_MODE=springboot 显示标签切换", async () => {
    stubEnvs({ VITE_API_MODE: "springboot" });
    const { env } = await import("@/lib/env");
    expect(env.apiMode).toBe("springboot");
  });

  it("VITE_SAAS_BASE_URL 覆盖 saas 地址", async () => {
    stubEnvs({ VITE_SAAS_BASE_URL: "https://idp.staging.example.com" });
    const { env } = await import("@/lib/env");
    expect(env.saasBaseUrl).toBe("https://idp.staging.example.com");
  });
});
