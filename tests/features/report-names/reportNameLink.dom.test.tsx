// M06.F07.I02 fnTest — 报告名称↔标准/参数关联（ReportNameLinkDialog toggle）。
//
// 报告名称列表行内「关联」→ 弹窗两段列表（标准 role=TESTING / 参数）→
// toggle POST/DELETE /api/report-names/links/{standard,parameter}。

import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { server } from "../../setup.dom";
import { installShapeAdapters, resetFixtures } from "../../helpers/seed";
import { ReportNameLinkDialog } from "@/features/report-names/ReportNameLinkDialog";

beforeEach(() => {
  cleanup();
  resetFixtures();
  installShapeAdapters(server);
});

function renderDialog(reportNameCode: string) {
  return render(
    <ReportNameLinkDialog
      open
      onOpenChange={() => {}}
      reportNameCode={reportNameCode}
      reportNameLabel="检测报告"
      onChanged={() => {}}
    />,
  );
}

describe("M06.F07.I02 报告名称↔标准/参数关联", () => {
  fnTest(["M06.F07.I02"], "关联弹窗：两段列表渲染（标准 + 参数，fixtures 真数据穿透）", async () => {
    renderDialog("RN-0001");
    await waitFor(() => {
      // aria-label 形如「关联标准 GB 175-2023」/「关联参数 IP-0001」
      expect(screen.getAllByRole("button", { name: /^(关联|解除)(标准|参数) / }).length).toBeGreaterThan(1);
    });
    expect(screen.getByText("关联维护 — 检测报告")).toBeTruthy();
    expect(screen.getByText("检测标准（role=检测）")).toBeTruthy();
    expect(screen.getByText("检测参数")).toBeTruthy();
  });

  fnTest(["M06.F07.I02"], "toggle 参数：POST 后按钮翻「解除」", async () => {
    renderDialog("RN-NO-LINK");
    const paramBtns = await waitFor(() => {
      // RN-NO-LINK 无既有 links → 全部「关联参数 …」
      const bs = screen.getAllByRole("button", { name: /^关联参数 / });
      expect(bs.length).toBeGreaterThan(0);
      return bs;
    });
    fireEvent.click(paramBtns[0]!);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^解除参数 / }).length).toBe(1);
    });
  });
});
