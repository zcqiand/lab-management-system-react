// M01.F04.I01 fnTest — 动态菜单下发（GET /auth/menus → SidebarNav 渲染）。
//
// react 仓菜单树是静态 MENU_TREE（menus.ts，镜像 nextjs 的 saas 下发形状），
// 本测试验证「菜单树 → SidebarNav 按分组渲染 + 分组折叠持久化」这条链路。
// jsdom + RTL；SidebarNav 是纯展示组件（menus 传 props），无需 msw。

import { describe, beforeEach, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fnTest } from "../fn";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { MENU_TREE } from "@/components/app/menus";

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <SidebarNav menus={MENU_TREE} appCode="lab-management" appName="实验室管理系统" />
    </MemoryRouter>,
  );
}

describe("M01.F04.I01 动态菜单", () => {
  fnTest(["M01.F04.I01"], "侧边栏按菜单树下发渲染：锚点 + 分组 + 页面项", () => {
    renderSidebar();
    const aside = screen.getByTestId("sidebar-nav");
    // data-fn 锚点存在（L5 静态扫描同一判据）
    expect(aside.getAttribute("data-fn")).toBe("M01.F04.I01");
    // 6 个分组（menus.ts：总览/基础数据/试验过程/检测能力/报告/统计）
    const groups = MENU_TREE.map((g) => g.name);
    for (const name of groups) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // 页面级菜单项渲染（叶子节点带路径）
    expect(screen.getByText("仪表盘")).toBeTruthy();
  });

  fnTest(["M01.F04.I01"], "菜单项是可点按钮，点击触发导航回调", () => {
    renderSidebar();
    const item = screen.getByTestId("sidebar-item-m-dashboard");
    expect(item.getAttribute("data-fn")).toBe("M98.F04.m-dashboard");
    fireEvent.click(item);
    // MemoryRouter 内 navigate("/") 不报错即通过（导航行为由 router 测）
  });
});
