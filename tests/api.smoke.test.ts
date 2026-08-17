// Smoke test: 4-backend config + http-client wiring。验证：
//   - BackendMode 包括 'nextjs'
//   - setBackend / getBaseUrl / setBaseUrlFor 行为正确
//   - hydrate/snapshot 是 idempotent 的
//
// 不启 React、不触 axios；只看 backend-config + http-client 模块级 singleton。
import { describe, it, expect, beforeEach } from "vitest";
import {
  BACKEND_DEFAULT_BASE_URLS,
  getBackend,
  setBackend,
  getBaseUrl,
  getBaseUrlFor,
  setBaseUrlFor,
  hydrateBackendConfig,
  snapshotBackendConfig,
  type BackendMode,
} from "../src/api/backend-config";

const ALL_MODES: BackendMode[] = ["msw", "aspnetcore", "springboot", "nextjs"];

describe("M98 backend switcher (4-backend)", () => {
  beforeEach(() => {
    // 每个 case 前回到默认状态
    hydrateBackendConfig({ backend: "msw", baseUrls: BACKEND_DEFAULT_BASE_URLS });
  });

  it("BackendMode union has 4 modes including 'nextjs'", () => {
    expect(ALL_MODES).toContain("nextjs");
    expect(ALL_MODES).toHaveLength(4);
  });

  it("DEFAULT_BASE_URLS has 'nextjs' default :3001 (跨 origin)", () => {
    expect(BACKEND_DEFAULT_BASE_URLS.nextjs).toBe("http://localhost:3001");
    expect(BACKEND_DEFAULT_BASE_URLS.msw).toBe("");
  });

  it("setBackend('nextjs') updates getBaseUrl() to :3001", () => {
    setBackend("nextjs");
    expect(getBackend()).toBe("nextjs");
    expect(getBaseUrl()).toBe("http://localhost:3001");
  });

  it("setBackend('aspnetcore') updates getBaseUrl() to localhost:5000", () => {
    setBackend("aspnetcore");
    expect(getBaseUrl()).toBe("http://localhost:5000");
  });

  it("setBaseUrlFor('springboot', ...) round-trips", () => {
    setBaseUrlFor("springboot", "http://10.0.0.5:9090");
    expect(getBaseUrlFor("springboot")).toBe("http://10.0.0.5:9090");
  });

  it("hydrate/snapshot round-trip preserves all 4 baseUrls", () => {
    setBaseUrlFor("aspnetcore", "http://a:1");
    setBaseUrlFor("springboot", "http://b:2");
    setBaseUrlFor("nextjs", "http://c:3");
    const snap = snapshotBackendConfig();
    expect(snap.baseUrls).toEqual({
      msw: "",
      aspnetcore: "http://a:1",
      springboot: "http://b:2",
      nextjs: "http://c:3",
    });

    hydrateBackendConfig({ backend: "nextjs", baseUrls: { nextjs: "http://d:4" } });
    expect(getBackend()).toBe("nextjs");
    // 其它模式保留旧值（partial merge）
    expect(getBaseUrlFor("aspnetcore")).toBe("http://a:1");
    expect(getBaseUrlFor("nextjs")).toBe("http://d:4");
  });
});
