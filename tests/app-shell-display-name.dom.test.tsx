// M00.F01.I01 fnTest — 顶栏登录用户显示名（空串回退回归锁）。
//
// 2026-09-23 现场：saas sys_user 无显示名列 → /me 不带 displayName →
// lab-aspnetcore SSO 落地 user.displayName=""（Upsert 存空串，FindByEmail
// 命中后不再更新）→ `??` 对空串不回退 → `{displayName && ...}` 为假 →
// header「租户旁用户名」整个消失。修复语义：displayName || username
// （|| 兜空串）；镜像 lab-nextjs header-session.dom.test.tsx 同款回归锁。
//
// 驱动方式：require-auth.dom.test.tsx 同款（axios mock 队列 + AuthProvider +
// MemoryRouter + __testActions.login），login 响应的 user 显式带
// displayName: "" 触发空串分支。

import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { fnTest } from "./fn";

// -- axios mock：可编程响应队列（endpoints.ts 走 axios）---------------------------

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
      throw new Error("display-name test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

import { AppShell } from "../src/components/app/app-shell";
import { AuthProvider, __testReset, __testActions } from "../src/state/auth-context";

// -- fixtures：displayName 显式空串（saas 真后端落地形状）--------------------------

const USER = { id: "u1", username: "alice@acme.io", displayName: "" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };

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

describe("M00.F01 顶栏用户显示名", () => {
  fnTest(
    ["M00.F01.I01"],
    "displayName 空串 → 回退 username 渲染（?? 不兜空串回归锁）",
    async () => {
      queue.push(
        {
          status: 200,
          data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] },
        },
        { status: 200, data: { permissions: [] } },
        { status: 200, data: [] }, // GET /api/auth/menus（AppShell mount 拉菜单）
      );
      await __testActions.login({ username: "alice@acme.io", password: "x" });
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<AppShell />} />
              <Route path="/login" element={<div data-testid="login-page">login</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );
      await flush();
      // 2026-09-23 用户裁定：header 用户区 = 显示名 + 租户切换器，「用户=」前缀退役
      //（锚点 appshell-user-name；原 /用户=/ 断言随之更新，|| 兜空串的回归意图不变）
      const el = await screen.findByTestId("appshell-user-name");
      expect(el.textContent).toContain("alice@acme.io");
    },
  );

  it("authenticated → header 渲染显示名 + 租户切换器，authenticated 状态徽标退役", async () => {
    queue.push(
      {
        status: 200,
        data: {
          token: "t1",
          refreshToken: "r1",
          user: { id: "u1", username: "admin", displayName: "管理员" },
          tenants: [TENANT_A],
        },
      },
      { status: 200, data: { permissions: [] } },
      { status: 200, data: [] }, // GET /api/auth/menus（AppShell mount 拉菜单）
    );
    await __testActions.login({ username: "admin", password: "x" });
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<AppShell />} />
            <Route path="/login" element={<div data-testid="login-page">login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    await flush();
    const userName = screen.getByTestId("appshell-user-name");
    expect(userName.textContent).toContain("管理员");
    const trigger = screen.getByTestId("tenant-switcher");
    expect(trigger.textContent).toContain("甲公司");
    expect(trigger.getAttribute("data-fn")).toBeTruthy();
    // 状态徽标退役：不再渲染 kind 字面
    expect(screen.queryByTestId("appshell-auth-state")).toBeNull();
  });
});
