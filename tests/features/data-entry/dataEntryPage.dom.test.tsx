import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fnTest } from "../../fn";
import {
  installRealChain,
  renderedCommissionCodes,
  seedCommissionCodes,
} from "../../helpers/real-chain";
import { DataEntryPage } from "@/features/data-entry/DataEntryPage";

/**
 * M03.F03 数据录入 smoke —— 真链路（直连真 nextjs :5201，msw 已拆）。
 *
 * 数据源：列表 = lab_dev.sample_receipts（flowStatus=data_entry 过滤，种子固定
 * 33 条）；弹窗 = GET /api/samples、/api/inspection/parameters、/api/test-records
 * （真 nextjs 路由）。旧版「beforeEach 直改 fixtures 推阶段」的准备随 msw 拆除。
 */

beforeEach(() => {
  installRealChain();
});

describe("M03.F03 数据录入", () => {
  fnTest(
    ["M03.F03.I01"],
    "数据录入：渲染标题 + 列表行（真库 data_entry 种子数据穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <DataEntryPage />
        </MemoryRouter>,
      );
      // B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → waitFor 断言
      await waitFor(() => {
        expect(screen.getByText("数据录入")).toBeTruthy();
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      // 种子锚：渲染出的委托书编号非空且 ⊆ shared 种子的 data_entry 编号集
      const allowed = seedCommissionCodes("data_entry");
      const rendered = renderedCommissionCodes();
      expect(rendered.length).toBeGreaterThan(0);
      for (const code of rendered) expect(allowed.has(code)).toBe(true);
    },
  );

  fnTest(
    ["M03.F03.I03"],
    "数据录入：行内「录入结果」按钮（人工改判 verdict 入口）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <DataEntryPage />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      const entryBtns = await waitFor(() => {
        const btns = screen.queryAllByRole("button", { name: "录入结果" });
        expect(btns.length).toBeGreaterThan(0);
        return btns;
      });
      fireEvent.click(entryBtns[0]!);
      // 弹窗标题包含 commissionCode
      await waitFor(() => {
        const titles = screen.getAllByRole("heading", { name: /录入结果 —/ });
        expect(titles.length).toBeGreaterThan(0);
      });
    },
  );

  fnTest(
    ["M03.F03.I02"],
    "数据录入：弹窗内「保存检测记录」按钮可见（M03.F03.I02 data-fn 锚点）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <DataEntryPage />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      const entryBtns = await waitFor(() => {
        const btns = screen.queryAllByRole("button", { name: "录入结果" });
        expect(btns.length).toBeGreaterThan(0);
        return btns;
      });
      fireEvent.click(entryBtns[0]!);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
      });
    },
  );
});
