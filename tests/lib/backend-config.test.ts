// backend-config 运行时后端选择（2026-09-23 用户裁定收窄 ADR-0014，镜像
// lab-management-system-vue src/api/backend-config.ts）。
//
// 本文件跑 node 档（无 window/localStorage）：只测纯函数语义——注册表形状、
// env 权威缺省、未知 mode 防脏值 throw、无 storage 时写覆盖静默 no-op。
// localStorage 覆盖的读写语义（jsdom 档）见 backend-switcher.dom.test.tsx。

import { describe, it, expect } from "vitest";
import {
  KNOWN_BACKENDS,
  getActiveBackend,
  getApiBaseUrl,
  getApiMode,
  setBackendOverride,
} from "@/api/backend-config";

describe("backend-config（三真后端注册表 + env 权威缺省）", () => {
  it("KNOWN_BACKENDS = 三真后端，端口分段 5200 段（msw 仓 2026-09-17 已删不在列）", () => {
    expect(KNOWN_BACKENDS.map((b) => b.mode)).toEqual([
      "nextjs",
      "aspnetcore",
      "springboot",
    ]);
    expect(KNOWN_BACKENDS.map((b) => b.baseUrl)).toEqual([
      "http://localhost:5201",
      "http://localhost:5204",
      "http://localhost:5205",
    ]);
  });

  it("无覆盖时回落 env 派生（.env.test: VITE_API_MODE=nextjs / VITE_API_BASE_URL=:5201）", () => {
    const active = getActiveBackend();
    expect(active.mode).toBe("nextjs");
    expect(getApiMode()).toBe("nextjs");
    expect(getApiBaseUrl()).toBe("http://localhost:5201");
  });

  it("setBackendOverride 未知 mode 直接 throw（防脏值静默失效）", () => {
    expect(() => setBackendOverride("msw" as never)).toThrow(/unknown backend mode/);
  });
});
