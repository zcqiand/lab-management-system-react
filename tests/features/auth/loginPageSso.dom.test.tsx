// M01.F05.I03 fnTest — SSO 授权码流（authorize + callback）三阶段。
//
// LoginPage 的 SSO 分支（ssoEnabled=true 时 useEffect）三阶段：
//   阶段 1：URL 带 ?token=（saas 已换 token）→ 存 localStorage + GET /me → setSession 进业务页
//   阶段 2：URL 带 ?code=&state=（未换 token）→ POST /api/auth/sso/callback 换 mock-jwt → setSession
//   阶段 3：无回调参数 → GET /api/auth/sso/authorize → window.location = authorizeUrl 跳 saas
//
// axios 在 orval 生成层被 vi.mock 拦截（auth-fsm.test.ts 同款队列模式）；
// 阶段 1 的裸 fetch 也用 vi.stubGlobal 拦截。jsdom + RTL + MemoryRouter。

import { describe, beforeEach, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { fnTest } from "../../fn";

// -- axios mock：可编程响应队列（endpoints.ts 走 axios）---------------------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string; body?: unknown }[] = [];

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    create: () => {
      throw new Error("sso test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

import { AuthProvider, __testReset } from "../../../src/state/auth-context";
import { BackendProvider } from "../../../src/state/backend-context";
import { LoginPage } from "../../../src/pages/LoginPage";

// -- fixtures ---------------------------------------------------------------------

const USER = { id: "u1", username: "admin" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const LOGIN_OK = { token: "sso-jwt-1", refreshToken: "rt-1", user: USER, tenants: [TENANT_A] };

function TestLocation() {
  const location = useLocation();
  return <div data-testid="test-location">{location.pathname + location.search}</div>;
}

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <BackendProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div data-testid="home">业务页</div>} />
            <Route path="*" element={<TestLocation />} />
          </Routes>
        </MemoryRouter>
      </BackendProvider>
    </AuthProvider>,
  );
}

beforeEach(() => {
  cleanup();
  queue.length = 0;
  calls.length = 0;
  __testReset();
  localStorage.clear();
  sessionStorage.clear();
  // setSession 要求 refreshToken 存量兜底（saas 场景 token 直达时只带 token+user）
  localStorage.setItem("lab.refreshToken", "rt-sso");
});

describe("M01.F05.I03 SSO 授权码流", () => {
  fnTest(["M01.F05.I03"], "阶段 3：无回调参数 → authorize 拿 authorizeUrl → 跳 saas", async () => {
    // jsdom 的 window.location.href 只读且不可导航 — 用 getter/setter 拦截赋值。
    // setter 记录目标 URL（断言用），读取回退原值（LoginPage 不读 href）。
    const original = window.location;
    let assignedHref = "";
    Object.defineProperty(window, "location", {
      configurable: true,
      get() {
        return new Proxy(original, {
          set(target, prop, value) {
            if (prop === "href") {
              assignedHref = String(value);
              return true;
            }
            return Reflect.set(target, prop, value);
          },
        });
      },
    });
    queue.push({ status: 200, data: { authorizeUrl: "http://saas:3000/login?redirect=%2F" } });
    try {
      renderAt("/login");
      await waitFor(() => {
        expect(calls.some((c) => c.url.includes("/api/auth/sso/authorize"))).toBe(true);
      });
      await waitFor(() => {
        expect(assignedHref).toBe("http://saas:3000/login?redirect=%2F");
      });
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });

  fnTest(["M01.F05.I03"], "阶段 2：?code=&state= → POST sso/callback 换 token → setSession 进业务页", async () => {
    queue.push({ status: 200, data: LOGIN_OK });
    renderAt("/login?code=abc&state=xyz");
    await waitFor(() => {
      expect(
        calls.some(
          (c) => c.method === "POST" && c.url.includes("/api/auth/sso/callback") && c.body && (c.body as { code: string }).code === "abc",
        ),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeTruthy();
    });
    expect(localStorage.getItem("lab.accessToken")).toBe("sso-jwt-1");
  });

  fnTest(["M01.F05.I03"], "阶段 1：?token= 直达 → 存 localStorage + /me 建会话 → 进业务页", async () => {
    // 阶段 1 用裸 fetch（不经 axios），stub 掉；/me 响应形状对齐 msw
    // （{ user, tenants, currentTenantId }），settleLogin 单租户直进 authenticated。
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: USER, tenants: [TENANT_A], currentTenantId: "t-a" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    // AuthProvider mount 的 hydrate 也走 axios /auth/me（此时 accessToken 已被
    // LoginPage setItem）—— 队列补一份响应，避免 hydrate 401→refresh 401→
    // clearPersisted 与阶段 1 竞争清掉 token（真实环境两请求都有后端）。
    queue.push({ status: 200, data: { user: USER, tenants: [TENANT_A], currentTenantId: "t-a" } });
    try {
      renderAt("/login?token=from-saas");
      // 等待 setSession 完成（/me 返回 → settleLogin → authenticated → Navigate to /）
      await waitFor(
        () => {
          expect(screen.getByTestId("home")).toBeTruthy();
        },
        { timeout: 3000 },
      );
      expect(localStorage.getItem("lab.accessToken")).toBe("from-saas");
      expect(fetchMock).toHaveBeenCalled();
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toContain("/api/auth/me");
      expect((init as { headers: Record<string, string> }).headers.Authorization).toBe(
        "Bearer from-saas",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
