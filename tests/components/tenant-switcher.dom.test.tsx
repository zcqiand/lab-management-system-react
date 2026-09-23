// TenantSwitcher（M00.F02.I01）— 镜像 lab-nextjs tenant-switcher.tsx + vue
// tests/app/tenantSwitcher.dom.test.ts。
//
// 驱动方式：__testSetState 直写 authenticated 态 + __testSetTenants 注入租户清单
//（settleLogin/hydrateAuth 的生产同步点在 auth-fsm.test.ts 已锁，这里锁 UI 行为）。
// radix DropdownMenu 内容走 Portal → 断言查 document.body；触发器/菜单项都走
// userEvent.click。测试标题不写 fn-ID 字面（fnReporter 回归锚教训）。

import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, __testSetState, __testSetTenants } from "@/state/auth-context";
import { TenantSwitcher } from "@/components/app/tenant-switcher";
import type { MyTenant } from "@/api/endpoints/model";
import type { AuthState } from "@/api/contracts";

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string }[] = [];

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    post: async (url: string) => {
      calls.push({ method: "POST", url });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(
          new Error(`Request failed with status code ${r?.status ?? 500}`),
          {
            response: r,
          },
        );
      }
      return { status: r.status, data: r.data };
    },
    get: async () => {
      throw new Error("tenant-switcher test 不应触达 axios.get");
    },
    create: () => {
      throw new Error("tenant-switcher test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

const TENANT_A: MyTenant = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const TENANT_B: MyTenant = { tenantId: "t-b", code: "DIST", name: "乙公司", roleIds: [] };

function toAuthenticated(current: MyTenant): void {
  const state: AuthState = {
    kind: "authenticated",
    value: {
      kind: "authenticated",
      user: { id: "u1", username: "admin" },
      tenant: current,
      permissions: [],
      tokenExpiresAt: Date.now() + 60_000,
    },
  };
  __testSetState(state);
}

function renderSwitcher(onSwitched?: () => void) {
  return render(
    <AuthProvider>
      <TenantSwitcher onSwitched={onSwitched} />
    </AuthProvider>,
  );
}

function bodyOption(tenantId: string): HTMLElement | null {
  return document.body.querySelector(
    `[data-testid="tenant-option-${tenantId}"]`,
  ) as HTMLElement | null;
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  cleanup();
  document.body.innerHTML = "";
  localStorage.clear();
  toAuthenticated(TENANT_A);
  __testSetTenants([TENANT_A, TENANT_B]);
});

describe("TenantSwitcher（镜像 lab-nextjs）", () => {
  it("触发器 = Building2 + 当前租户名 + ChevronsUpDown，带 data-fn 锚点", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    const trigger = screen.getByTestId("tenant-switcher");
    expect(trigger.getAttribute("data-fn")).toBeTruthy();
    expect(trigger.textContent).toContain("甲公司");
    await user.click(trigger);
    expect(bodyOption("t-a")?.textContent).toContain("甲公司");
    expect(bodyOption("t-b")?.textContent).toContain("乙公司");
  });

  it("点击其他租户 → POST /api/auth/switch-tenant + 成功后触发 onSwitched（整页刷新）", async () => {
    const switched = vi.fn();
    queue.push({
      status: 200,
      data: {
        token: "t2",
        refreshToken: "r2",
        user: { id: "u1", username: "admin" },
        tenants: [TENANT_B],
      },
    });
    const user = userEvent.setup();
    renderSwitcher(switched);
    await user.click(screen.getByTestId("tenant-switcher"));
    await user.click(bodyOption("t-b")!);
    expect(calls.some((c) => c.url.includes("/api/auth/switch-tenant"))).toBe(true);
    expect(switched).toHaveBeenCalledTimes(1);
  });

  it("切换失败 → 触发器下方就地渲染错误文案 + 不触发 onSwitched", async () => {
    const switched = vi.fn();
    queue.push({ status: 404, data: { code: "NOT_FOUND", message: "Tenant not found" } });
    const user = userEvent.setup();
    renderSwitcher(switched);
    await user.click(screen.getByTestId("tenant-switcher"));
    await user.click(bodyOption("t-b")!);
    const err = document.querySelector('[data-testid="tenant-switcher-error"]');
    // 404 → 友好文案（镜像 lab-nextjs toast 语义），不透传原始 axios message
    expect(err?.textContent).toContain("该租户不存在或你不是其成员");
    expect(switched).not.toHaveBeenCalled();
  });

  it("点击当前租户 → 不发请求（幂等守卫）", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId("tenant-switcher"));
    await user.click(bodyOption("t-a")!);
    expect(calls.some((c) => c.url.includes("/api/auth/switch-tenant"))).toBe(false);
  });
});
