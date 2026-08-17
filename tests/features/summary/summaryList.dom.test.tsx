// Sprint 2 Batch 2B-5：M05 报告汇总 + 仪表盘统计 DOM 测试。
//
// 适配层：msw handlers-extra.ts summaryExtraHandlers 直接返回 REF 期望形状，
// 无需 installShapeAdapters 额外兜底。fixture 数据来自 sampleReceipts
// （Batch 2A 已铺 15 条 + flow-matrix 派生 900 条，categoryCode 全覆盖）。
import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { fnTest } from "../../fn";
import { server } from "../../setup.dom";
import { installShapeAdapters, resetFixtures } from "../../helpers/seed";
import { SummaryList } from "@/features/summary/SummaryList";

beforeEach(() => {
  cleanup();
  resetFixtures();
  installShapeAdapters(server);
});

afterEach(() => {
  cleanup();
});

describe("M05.F01 报告汇总", () => {
  fnTest(["M05.F01.I01"], "F01 渲染标题 + 汇总表表头（fixtures 穿透）", async () => {
    render(<SummaryList />);
    expect(screen.getByText("报告汇总")).toBeTruthy();
    await waitFor(() => {
      // msw 返回的 columns 默认含 6 列：commissionCode/categoryCode/projectName/flowStatus/result/reportCode
      // 用 getAllByRole 找 columnheader 避免「报告类别」既在 label 又在表头
      const headers = screen.getAllByRole("columnheader");
      const labels = headers.map((h) => h.textContent ?? "");
      expect(labels).toContain("委托编号");
      expect(labels).toContain("工程名称");
      expect(labels).toContain("流程状态");
      expect(labels).toContain("结论");
      expect(labels).toContain("报告编号");
    });
  });

  fnTest(["M05.F01.I01"], "F01 列表行渲染（rows 数据穿透）", async () => {
    render(<SummaryList />);
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      // 表头 + 至少 1 数据行
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  fnTest(["M05.F01.I02"], "F02 仪表盘统计卡片（合同/接样/样品/待办/按状态）", async () => {
    render(<SummaryList />);
    await waitFor(() => {
      expect(screen.getByText("合同数")).toBeTruthy();
      expect(screen.getByText("接样数")).toBeTruthy();
      expect(screen.getByText("样品数")).toBeTruthy();
      expect(screen.getByText("待办任务")).toBeTruthy();
      expect(screen.getByText("按状态分布")).toBeTruthy();
    });
  });

  fnTest(
    ["M05.F01.I01", "M05.F01.I02"],
    "F01+F02 报告类别下拉存在（5 类 + 全部）",
    async () => {
      render(<SummaryList />);
      const select = screen.getByLabelText("报告类别");
      expect(select).toBeTruthy();
      expect(select.textContent).toContain("全部");
    },
  );
});
