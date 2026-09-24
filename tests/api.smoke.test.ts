// Smoke test: backend-config（ADR-0012 v0.3.0 + 2026-09-23 用户裁定收窄 ADR-0014，
// 2026-09-25 用户线上 502 根因修复：删 byEnv KNOWN_BACKENDS localhost 兜底）。
//
// 验证：
//   - getApiBaseUrl / getApiMode 行为正确
//   - 无 override 时 → env 直通（部署期权威缺省，prod 域名不被 localhost URL 覆盖）
//   - localStorage override → URL 取注册表（dev 切后端用）
//   - 注册表外 mode 直通 env（原「未知 mode 防脏值 throw」是 setBackendOverride 路径，
//     非 getActiveBackend 路径——get 永远走 env 派生，不再 fail）
//
// 不启 React、不触 axios；只看 backend-config 模块导出。
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("backend-config (env 直通 + override 走 KNOWN_BACKENDS)", () => {
  beforeEach(() => {
    // 每个 case 前清 stub env
    for (const k of Object.keys(import.meta.env)) {
      if (k.startsWith("VITE_")) {
        delete (import.meta.env as Record<string, unknown>)[k];
      }
    }
    vi.resetModules();
    // localStorage jsdom 兜底（node 档 localStorage 是 jsdom globalThis 注入，
    // 每个 case beforeEach 清防串扰）
    try {
      (globalThis as { localStorage?: Storage }).localStorage?.clear?.();
    } catch {
      /* node 无 localStorage 时 swallow */
    }
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

  it("mode=nextjs 无 override → URL env.baseUrl 直通（prod 域名不被 localhost 覆盖）", async () => {
    // 2026-09-25 修复：删 byEnv KNOWN_BACKENDS 兜底后，无 override 永远走 env.apiBaseUrl。
    // 这是 prod bundle 不再指 localhost:5204 的关键 invariant。
    stubEnvs({
      VITE_API_BASE_URL: "https://lab-aspnetcore.xiangru.uk",
      VITE_API_MODE: "nextjs",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("https://lab-aspnetcore.xiangru.uk");
    expect(getApiMode()).toBe("nextjs");
  });

  it("mode=springboot 无 override → URL env.baseUrl 直通", async () => {
    // 镜像前一条，springboot 仓 Dockerfile bake VITE_API_BASE_URL=https://lab-springboot.xiangru.uk
    stubEnvs({
      VITE_API_BASE_URL: "https://lab-springboot.xiangru.uk",
      VITE_API_MODE: "springboot",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("https://lab-springboot.xiangru.uk");
    expect(getApiMode()).toBe("springboot");
  });

  it("mode=aspnetcore 无 override → URL env.baseUrl 直通", async () => {
    // 镜像前两条，aspnetcore 仓 Dockerfile bake VITE_API_BASE_URL=https://lab-aspnetcore.xiangru.uk
    stubEnvs({
      VITE_API_BASE_URL: "https://lab-aspnetcore.xiangru.uk",
      VITE_API_MODE: "aspnetcore",
    });
    const { getApiBaseUrl, getApiMode } = await import("@/api/backend-config");
    expect(getApiBaseUrl()).toBe("https://lab-aspnetcore.xiangru.uk");
    expect(getApiMode()).toBe("aspnetcore");
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
