import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fnTest } from "../../fn";
import {
  installRealChain,
  renderedCommissionCodes,
  seedCommissionCodes,
} from "../../helpers/real-chain";
import ReportReviewPage from "@/pages/ReportReviewPage";
import ReportApprovePage from "@/pages/ReportApprovePage";
import ReportIssuePage from "@/pages/ReportIssuePage";
import ReportArchivePage from "@/pages/ReportArchivePage";

/**
 * M03.F05/F06/F07/F08 报告 4 阶段 smoke —— 真链路（直连真
 * nextjs :5201，msw 已拆）。
 *
 * 4 页共享 ReportPhasePage 组件，按 flowStatus 过滤同型（GET /api/receipts?
 * flowStatus=<stage>）。shared 种子每阶段固定 30 行，旧版「beforeEach 手工推
 * fixtures 进阶段」的准备随 msw 拆除，不再需要也不再允许。
 */

type Phase = "review" | "approval" | "issuance" | "archived";

beforeEach(() => {
  installRealChain();
});

/** 列表非空 + 渲染编号 ⊆ 该阶段种子编号集（真库数据锚）。
 *  B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → waitFor 断言。 */
async function expectStageRendered(title: string, stage: Phase, timeout = 30_000) {
  await waitFor(
    () => {
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    },
    { timeout },
  );
  const allowed = seedCommissionCodes(stage);
  const rendered = renderedCommissionCodes();
  expect(rendered.length).toBeGreaterThan(0);
  for (const code of rendered) expect(allowed.has(code)).toBe(true);
}

describe("M03.F05 报告审核", () => {
  fnTest(
    ["M03.F05.I01"],
    "报告审核：渲染标题 + 列表行（真库 review 阶段种子穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportReviewPage />
        </MemoryRouter>,
      );
      await expectStageRendered("报告审核", "review");
    },
  );

  fnTest(
    ["M03.F05.I02"],
    "报告审核：「审核通过」按钮 data-fn 可见",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportReviewPage />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      expect(screen.getByRole("button", { name: /审核通过/ })).toBeTruthy();
    },
  );
});

describe("M03.F06 报告批准", () => {
  fnTest(
    ["M03.F06.I01"],
    "报告批准：渲染标题 + 列表行（真库 approval 阶段种子穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportApprovePage />
        </MemoryRouter>,
      );
      await expectStageRendered("报告批准", "approval");
    },
  );

  fnTest(
    ["M03.F06.I02"],
    "报告批准：「批准」按钮 data-fn 可见",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportApprovePage />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      expect(screen.getByRole("button", { name: /批准/ })).toBeTruthy();
    },
  );
});

describe("M03.F07 报告发放", () => {
  fnTest(
    ["M03.F07.I01"],
    "报告发放：渲染标题 + 列表行（真库 issuance 阶段种子穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportIssuePage />
        </MemoryRouter>,
      );
      await expectStageRendered("报告发放", "issuance");
    },
  );

  fnTest(
    ["M03.F07.I02"],
    "报告发放：「发放」按钮 data-fn 可见",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportIssuePage />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      expect(screen.getByRole("button", { name: /发放/ })).toBeTruthy();
    },
  );
});

describe("M03.F08 报告归档", () => {
  fnTest(
    ["M03.F08.I01"],
    "报告归档：渲染标题 + 列表行（真库 archived 阶段种子穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportArchivePage />
        </MemoryRouter>,
      );
      await expectStageRendered("报告归档", "archived");
    },
  );

  fnTest(
    ["M03.F08.I02"],
    "报告归档：「归档完成」按钮 data-fn 可见",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReportArchivePage />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      expect(screen.getByRole("button", { name: /归档完成/ })).toBeTruthy();
    },
  );
});
