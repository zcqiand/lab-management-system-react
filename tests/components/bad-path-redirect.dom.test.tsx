// BadPathRedirect 测试 — 兜底 saas post-login 把字面量 "undefined" / "null" /
// "NaN" / "false" / "true" 拼到 URL 路径直接 navigate（不走 ?from= query，
// sanitizeRedirect 拦不到）。

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { BadPathRedirect } from "@/components/app/bad-path-redirect";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div data-testid="home">home</div>} />
        <Route path="*" element={<BadPathRedirect />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BadPathRedirect", () => {
  it("路径 /undefined → 静默 Navigate 到 /", () => {
    const { container } = renderAt("/undefined");
    expect(screen.getByTestId("home")).toBeTruthy();
    expect(container.querySelector('[data-testid="404"]')).toBeNull();
  });

  it("路径 /null → 静默 Navigate 到 /", () => {
    renderAt("/null");
    expect(screen.getByTestId("home")).toBeTruthy();
  });

  it("路径 /NaN → 静默 Navigate 到 /", () => {
    renderAt("/NaN");
    expect(screen.getByTestId("home")).toBeTruthy();
  });

  it("路径 /false → 静默 Navigate 到 /", () => {
    renderAt("/false");
    expect(screen.getByTestId("home")).toBeTruthy();
  });

  it("路径 /true → 静默 Navigate 到 /", () => {
    renderAt("/true");
    expect(screen.getByTestId("home")).toBeTruthy();
  });

  it("路径 /undefined/data-entry → /undefined 第一段匹配 → /", () => {
    renderAt("/undefined/data-entry");
    expect(screen.getByTestId("home")).toBeTruthy();
  });

  it("路径 /login（非兜底名单）→ 显示 404（不拦截真实路由）", () => {
    renderAt("/login");
    expect(screen.queryByTestId("home")).toBeNull();
    // 实际不是 home：被 * 接管后 404 渲染 EmptyState title="404"
  });

  it("路径 /data-entry/123（合法路由但不存在） → 404（不拦截）", () => {
    renderAt("/data-entry/123");
    expect(screen.queryByTestId("home")).toBeNull();
  });

  it("路径 /（根）→ home（不应被 * 接管）", () => {
    renderAt("/");
    expect(screen.getByTestId("home")).toBeTruthy();
  });
});