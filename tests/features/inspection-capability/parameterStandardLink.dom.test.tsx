// M06.F03.I02 fnTest — 参数↔标准关联（ParameterStandardLinkDialog toggle）。
//
// InspectionCapabilityList parameters 资源行内「关联标准」→ 弹窗列出标准 →
// toggle POST/DELETE /api/inspection/links/standard-parameter。
// msw shape adapters（tests/helpers/seed.ts）已包 links GET 为 {items}。

import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { server } from "../../setup.dom";
import { installShapeAdapters, resetFixtures } from "../../helpers/seed";
import { ParameterStandardLinkDialog } from "@/features/inspection-capability/ParameterStandardLinkDialog";

beforeEach(() => {
  cleanup();
  resetFixtures();
  installShapeAdapters(server);
});

describe("M06.F03.I02 参数↔标准关联", () => {
  fnTest(["M06.F03.I02"], "关联弹窗：列出标准 + 已关联态（IP-0001 已关联 GB 175-2023，fixtures 真数据穿透）", async () => {
    render(
      <ParameterStandardLinkDialog
        open
        onOpenChange={() => {}}
        parameterCode="IP-0001"
        parameterName="抗压强度"
        onChanged={() => {}}
      />,
    );
    // GB 175-2023 在 fixtures 已关联 IP-0001 → 按钮初始即「解除关联」
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "解除关联 GB 175-2023" })).toBeTruthy();
    });
    expect(screen.getByText("关联标准 — 抗压强度")).toBeTruthy();
  });

  fnTest(["M06.F03.I02"], "toggle：未关联标准 → POST 后按钮翻「解除关联」", async () => {
    render(
      <ParameterStandardLinkDialog
        open
        onOpenChange={() => {}}
        parameterCode="IP-0999"
        parameterName="测试参数"
        onChanged={() => {}}
      />,
    );
    const btns = await waitFor(() => {
      const bs = screen.getAllByRole("button", { name: /^关联 / });
      expect(bs.length).toBeGreaterThan(0);
      return bs;
    });
    fireEvent.click(btns[0]!);
    // POST 成功后按钮翻转为解除关联
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^解除关联 / }).length).toBeGreaterThan(0);
    });
  });
});
