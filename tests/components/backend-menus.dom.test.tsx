// M01.F04.I01 fnTest — useBackendMenus 动态菜单下发（GET /api/auth/menus）。
//
// 2026-08-25 起菜单数据源从 saas /api/saas/me/menus 切到 lab 后端
// /api/auth/menus（orval authGetMenus；springboot 侧 saas 快照缓存 →
// miss 503，2026-08-27 起 demo 兜底删除）。本测试验证三条链路：
//   1. hook 拉取成功 → 契约 MenuNode 适配成本地渲染树（group/page 推导）
//   2. 请求失败 → 抛错（不静默回退静态树），ErrorBoundary 兜
//   3. hook 确实走 /api/auth/menus 端点（防回退到旧 saas 路径）
// axios 在 orval 生成层被 vi.mock 拦截（loginPageSso.dom.test 同款队列模式）。

import { describe, beforeEach, expect, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fnTest } from "../fn";

// -- axios mock：可编程响应队列（endpoints.ts 走 axios）---------------------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string }[] = [];

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
    post: async () => {
      throw new Error("menus 测试不应触达 POST");
    },
    create: () => {
      throw new Error("menus 测试不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

import { useBackendMenus } from "@/components/app/sidebar-nav";

// -- fixtures：契约形状（shared tsp MenuNode{id,label,path?,icon?,children?}）---

const CONTRACT_MENUS = [
  {
    id: "overview",
    label: "总览",
    icon: "layout-dashboard",
    children: [
      { id: "dashboard", label: "仪表盘", path: "/dashboard", icon: "gauge" },
    ],
  },
  { id: "standalone", label: "独立页", path: "/solo" },
];

// 错误边界：捕获子组件 throw，避免单测崩溃；同时断言错误态 UI。
class MenuErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (this.state.error) {
      return <div data-testid="menus-error">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function Harness() {
  const { data, loading } = useBackendMenus();
  if (loading) return <div data-testid="menus-loading" />;
  if (!data) return <div data-testid="menus-null" />;
  return (
    <ul>
      {data.map((g) => (
        <li key={g.id} data-testid={`group-${g.id}`} data-type={g.type}>
          {g.name}
          <ul>
            {(g.children ?? []).map((c) => (
              <li key={c.id} data-testid={`item-${c.id}`} data-type={c.type}>
                {c.name}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function renderHarness() {
  return render(
    <MemoryRouter>
      <MenuErrorBoundary>
        <Harness />
      </MenuErrorBoundary>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  queue.length = 0;
  calls.length = 0;
});

describe("M01.F04.I01 useBackendMenus", () => {
  fnTest(["M01.F04.I01"], "成功：/api/auth/menus 契约树适配为本地渲染树（有子节点=group）", async () => {
    queue.push({ status: 200, data: CONTRACT_MENUS });
    renderHarness();

    await waitFor(() => {
      // 顶层 group：type 由 children 推导，name 取 label
      const group = screen.getByTestId("group-overview");
      expect(group.getAttribute("data-type")).toBe("group");
      expect(screen.getByText("总览")).toBeTruthy();
    });
    // 叶子 page：带 path，type=page
    const leaf = screen.getByTestId("item-dashboard");
    expect(leaf.getAttribute("data-type")).toBe("page");
    expect(screen.getByText("仪表盘")).toBeTruthy();
    // 无子节点的顶层节点也是 page
    expect(screen.getByTestId("group-standalone").getAttribute("data-type")).toBe("page");
    // 端点正确（防回退到旧 saas 路径）
    expect(calls).toEqual([{ method: "GET", url: "/api/auth/menus" }]);
  });

  fnTest(["M01.F04.I01"], "失败：抛错上抛，不静默回退静态 MENU_TREE（demo 兜底已删）", async () => {
    queue.push({ status: 500, data: { message: "boom" } });
    renderHarness();

    await waitFor(() => {
      // 错误边界接住抛错，渲染错误态（不再是 menus-null 或静态树）
      const errNode = screen.getByTestId("menus-error");
      expect(errNode.textContent).toMatch(/HTTP 500/);
    });
    // 静态 MENU_TREE 不应渲染（无 g-overview 等 saas code 标签）
    expect(screen.queryByTestId("group-g-overview")).toBeNull();
  });
});
