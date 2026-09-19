// M05 报告汇总 + 仪表盘统计 DOM 测试 —— 真链路（直连真 nextjs :5201，msw 已拆）。
//
// GET /api/summary 与 /api/summary/stats 的行/统计派生自 nextjs 进程内
// fixtures（与 shared 种子同源灌入），形状为 REF 期望的
// {summaryName, columns, rows} 与 {contractCount, ...reportCountByStatus}。
// 断言锚：表头列标签 + 委托编号形状 + 统计卡字段；不锚易变的计数值。
import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fnTest } from "../../fn";
import {
  installRealChain,
  renderedCommissionCodes,
  COMMISSION_CODE_RE,
} from "../../helpers/real-chain";
import { SummaryList } from "@/features/summary/SummaryList";

beforeEach(() => {
  installRealChain();
});

describe("M05.F01 报告汇总", () => {
  fnTest(
    ["M05.F01.I01"],
    "F01 渲染标题 + 汇总表表头（真后端 columns 穿透）",
    { timeout: 45_000 },
    async () => {
      render(<SummaryList />);
      // B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → waitFor 断言
      await waitFor(() => {
        expect(screen.getByText("报告汇总")).toBeTruthy();
        // 真后端 columns 6 列：commissionCode/categoryCode/projectName/flowStatus/result/reportCode
        // 用 getAllByRole 找 columnheader 避免「报告类别」既在 label 又在表头
        const headers = screen.getAllByRole("columnheader");
        const labels = headers.map((h) => h.textContent ?? "");
        expect(labels).toContain("委托编号");
        expect(labels).toContain("工程名称");
        expect(labels).toContain("流程状态");
        expect(labels).toContain("结论");
        expect(labels).toContain("报告编号");
      });
    },
  );

  fnTest(
    ["M05.F01.I01"],
    "F01 列表行渲染（rows 数据穿透，编号形状锚种子委托编号字面）",
    { timeout: 45_000 },
    async () => {
      render(<SummaryList />);
      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // 表头 + 至少 1 数据行
        expect(rows.length).toBeGreaterThan(1);
      });
      // 种子锚：渲染出的委托编号非空且全部命中 WS-2026-Fxxxx 字面形状
      const rendered = renderedCommissionCodes();
      expect(rendered.length).toBeGreaterThan(0);
      for (const code of rendered) expect(COMMISSION_CODE_RE.test(code)).toBe(true);
    },
  );

  fnTest(
    ["M05.F01.I02"],
    "F02 仪表盘统计卡片（合同/接样/样品/待办/按状态）",
    { timeout: 45_000 },
    async () => {
      render(<SummaryList />);
      await waitFor(() => {
        expect(screen.getByText("合同数")).toBeTruthy();
        expect(screen.getByText("接样数")).toBeTruthy();
        expect(screen.getByText("样品数")).toBeTruthy();
        expect(screen.getByText("待办任务")).toBeTruthy();
        expect(screen.getByText("按状态分布")).toBeTruthy();
      });
    },
  );

  fnTest(
    ["M05.F01.I06"],
    "I06 仪表盘统计基础端点：GET /summary/stats 基础字段穿透渲染",
    { timeout: 45_000 },
    async () => {
      render(<SummaryList />);
      await waitFor(() => {
        // 基础 4 计数从 /summary/stats 拉到（占位 '-' 消失 → 全数字）
        const grid = screen.getByText("合同数").closest("div.grid");
        expect(grid).toBeTruthy();
        expect(grid!.textContent, "统计卡不应残留加载占位 '-'").not.toContain("-");
        // 报告状态 3 桶（draft=草稿 / reviewing=审核中 / issued=已发）
        expect(screen.getByText(/草稿：\d+/)).toBeTruthy();
        expect(screen.getByText(/审核中：\d+/)).toBeTruthy();
        expect(screen.getByText(/已发：\d+/)).toBeTruthy();
      });
    },
  );

  fnTest(
    ["M05.F01.I01", "M05.F01.I02"],
    "F01+F02 报告类别下拉存在（5 类 + 全部）",
    { timeout: 45_000 },
    async () => {
      render(<SummaryList />);
      // B6 加载态：整页 PageLoading 门控后，筛选区随数据一起出现 → waitFor 断言
      await waitFor(() => {
        const select = screen.getByLabelText("报告类别");
        expect(select).toBeTruthy();
        expect(select.textContent).toContain("全部");
      });
    },
  );
});
