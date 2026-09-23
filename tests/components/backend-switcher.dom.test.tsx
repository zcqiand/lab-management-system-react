// BackendSwitcher — 侧栏 footer 后端切换器（2026-09-23 用户裁定收窄 ADR-0014）。
//
// 镜像 lab-management-system-vue tests/app/backendSwitcher.dom.test.tsx：
//   1. 触发器 = ghost + Server 图标 + 活动 mode 字面，落侧栏 footer（深色底）
//   2. 点开 → 三后端候选全量渲染在 document.body（radix Portal 配方）
//   3. 活动后端候选高亮 bg-accent
//   4. 点其他后端 → 写覆盖 + 清本机会话 + 整页刷新
// 覆盖读写的纯函数语义在 tests/lib/backend-config.test.ts（node 档）锁。

import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackendSwitcher } from "@/components/app/backend-switcher";
import { clearBackendOverride, setBackendOverride } from "@/api/backend-config";
import { TOKEN_STORAGE_KEYS } from "@/api/contracts";

function bodyOption(mode: string): HTMLElement | null {
  // radix DropdownMenu.Portal → document.body
  return document.body.querySelector(
    `[data-testid="backend-option-${mode}"]`,
  ) as HTMLElement | null;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  clearBackendOverride();
  document.body.innerHTML = "";
});

describe("BackendSwitcher（侧栏 footer 后端切换）", () => {
  it("触发器渲染活动 mode 字面（显式钉覆盖态，不赌 env）", async () => {
    setBackendOverride("springboot");
    render(<BackendSwitcher />);
    const trigger = screen.getByTestId("backend-switcher-trigger");
    expect(trigger.textContent).toContain("springboot");
  });

  it("点开 → 三后端候选渲染在 body，带 label + baseUrl", async () => {
    const user = userEvent.setup();
    render(<BackendSwitcher />);
    await user.click(screen.getByTestId("backend-switcher-trigger"));
    expect(bodyOption("nextjs")?.textContent).toContain("http://localhost:5201");
    expect(bodyOption("aspnetcore")?.textContent).toContain("http://localhost:5204");
    expect(bodyOption("springboot")?.textContent).toContain("http://localhost:5205");
  });

  it("活动后端候选高亮 bg-accent，其余 cursor-pointer", async () => {
    setBackendOverride("aspnetcore");
    const user = userEvent.setup();
    render(<BackendSwitcher />);
    await user.click(screen.getByTestId("backend-switcher-trigger"));
    expect(bodyOption("aspnetcore")?.className).toContain("bg-accent");
    expect(bodyOption("nextjs")?.className).toContain("cursor-pointer");
  });

  it("点其他后端 → 写覆盖 + 清本机会话（跨后端 token 不通用）+ 整页刷新", async () => {
    // 预置本机会话：切换后必须被清（陈旧 token 401 教训）
    localStorage.setItem(TOKEN_STORAGE_KEYS.accessToken, "stale-token");
    localStorage.setItem(TOKEN_STORAGE_KEYS.refreshToken, "stale-refresh");
    localStorage.setItem(TOKEN_STORAGE_KEYS.activeTenantId, "t-a");
    // jsdom 的 location.reload 不可 redefine → 整个 location 换桩
    const reload = vi.fn();
    vi.stubGlobal("location", { href: "http://localhost:5202/", reload });
    const user = userEvent.setup();
    render(<BackendSwitcher />);
    await user.click(screen.getByTestId("backend-switcher-trigger"));
    await user.click(bodyOption("springboot")!);
    expect(localStorage.getItem("lab.backend.override")).toBe("springboot");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken)).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.refreshToken)).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.activeTenantId)).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
