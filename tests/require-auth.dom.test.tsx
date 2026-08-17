// Sprint 1 挂账补测 — M01.F04.I03（路由守卫：未登录/无权限拦截）。
//
// jsdom + RTL 环境（Sprint 2 Batch 0 双 project 基建就位后首批 dom 测试）。
// 驱动方式：先经 __testActions（axios mock）把模块级 store 推到目标 FSM 态，
// 再渲染 useRequireAuth 探针组件，断言跳转行为（MemoryRouter + TestLocation）。

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { fnTest } from "./fn";

// -- axios mock（与 auth-fsm.test.ts 同款；守卫用例只需 login 路径）------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    post: async () => {
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    get: async () => {
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    create: () => {
      throw new Error("guard test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

import { AuthProvider, __testReset, __testActions } from "../src/state/auth-context";
import { useRequireAuth } from "../src/state/require-auth";

const USER = { id: "u1", username: "admin" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const TENANT_B = { tenantId: "t-b", code: "BETA", name: "乙公司", roleIds: [] };

function TestLocation() {
  const location = useLocation();
  return <div data-testid="test-location">{location.pathname + location.search}</div>;
}

/** 守卫探针：挂在 /secret 路由，useRequireAuth 的结果渲染出来 */
function GuardProbe({ permissions }: { permissions?: string[] }) {
  const { allowed } = useRequireAuth({ permissions });
  return <span data-testid="guard-allowed">{String(allowed)}</span>;
}

function renderGuard(permissions?: string[]): ReturnType<typeof render> {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/secret" element={<GuardProbe permissions={permissions} />} />
          <Route path="/login" element={<div data-testid="login-page">login</div>} />
          <Route path="/select-tenant" element={<div data-testid="select-tenant-page">tenant</div>} />
          <Route path="/403" element={<div data-testid="forbidden-page">403</div>} />
        </Routes>
        <TestLocation />
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  queue.length = 0;
  localStorage.clear();
  __testReset();
});

describe("useRequireAuth 路由守卫", () => {
  fnTest(["M01.F04.I03"], "anonymous 访问受守卫路由 → 跳 /login 带 from 回跳", async () => {
    // 先落 anonymous：无 token hydrate
    __testReset();
    localStorage.removeItem("lab.accessToken");
    await __testActions.logout(); // 无 token 时也把 store 落到 anonymous
    renderGuard();
    await flush();
    expect(screen.getByTestId("test-location").textContent).toBe("/login?from=%2Fsecret");
    expect(screen.getByTestId("login-page")).toBeTruthy();
  });

  fnTest(["M01.F04.I03"], "awaiting_tenant 访问受守卫路由 → 跳 /select-tenant", async () => {
    // login 多租户（无记忆租户）→ awaiting_tenant（此路径不发 permissions 请求）
    queue.push({ status: 200, data: { token: "t2", refreshToken: "r2", user: USER, tenants: [TENANT_A, TENANT_B] } });
    await __testActions.login({ username: "admin", password: "x" });
    renderGuard();
    await flush();
    expect(screen.getByTestId("test-location").textContent).toBe("/select-tenant");
    expect(screen.getByTestId("select-tenant-page")).toBeTruthy();
  });

  fnTest(["M01.F04.I03"], "authenticated 缺权限 → 拦在 /403", async () => {
    // login 单租户 + permissions []（空权限）→ authenticated
    queue.push(
      { status: 200, data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] } },
      { status: 200, data: { permissions: [] } },
    );
    await __testActions.login({ username: "admin", password: "x" });
    renderGuard(["report:approve"]); // 要求一个没有的权限
    await flush();
    expect(screen.getByTestId("test-location").textContent).toBe("/403");
    expect(screen.getByTestId("forbidden-page")).toBeTruthy();
  });

  fnTest(["M01.F04.I03"], "authenticated 权限齐 → allowed=true 留在原地", async () => {
    queue.push(
      { status: 200, data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] } },
      { status: 200, data: { permissions: ["report:approve"] } },
    );
    await __testActions.login({ username: "admin", password: "x" });
    renderGuard(["report:approve"]);
    await flush();
    expect(screen.getByTestId("test-location").textContent).toBe("/secret");
    expect(screen.getByTestId("guard-allowed").textContent).toBe("true");
  });

  it("非 authenticated 态 hasPermission 恒 false（守卫联动断言，不挂功能 ID）", () => {
    expect(__testActions.hasPermission("report:approve")).toBe(false);
  });
});
