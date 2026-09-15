import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { fnTest } from "../../fn";
import {
  installRealChain,
  renderedCommissionCodes,
  seedCommissionCodes,
} from "../../helpers/real-chain";
import { server } from "../../setup.dom";
import { TaskAssignmentList } from "@/features/task-assignment/TaskAssignmentList";

/**
 * M03.F02 任务分配 smoke —— 真链路（msw passthrough，直连真 nextjs :5201）。
 *
 * 数据源：lab_dev.sample_receipts，列表按 flowStatus=task_assignment 过滤
 * （GET /api/receipts?flowStatus=task_assignment）。shared 种子固定含 33 条
 * task_assignment 行，无需（也不再允许）beforeEach 直改 fixtures——旧版
 * 「手工推进一条 receiving 行」的准备工作随 msw fixtures 一起拆除。
 */

beforeEach(() => {
  installRealChain(server);
});

describe("M03.F02 任务分配", () => {
  fnTest(
    ["M03.F02.I01"],
    "任务分配：渲染标题 + 列表行（真库 task_assignment 种子数据穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <TaskAssignmentList />
        </MemoryRouter>,
      );
      expect(screen.getByText("任务分配")).toBeTruthy();
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      // 种子锚：渲染出的委托书编号非空且 ⊆ shared 种子的 task_assignment 编号集
      const allowed = seedCommissionCodes("task_assignment");
      const rendered = renderedCommissionCodes();
      expect(rendered.length).toBeGreaterThan(0);
      for (const code of rendered) expect(allowed.has(code)).toBe(true);
    },
  );

  fnTest(["M03.F02.I02"], "任务分配：安排按钮开弹窗", { timeout: 45_000 }, async () => {
    render(
      <MemoryRouter>
        <TaskAssignmentList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    });
    const arrangeBtns = await waitFor(() => {
      const btns = screen.queryAllByRole("button", { name: "安排" });
      expect(btns.length).toBeGreaterThan(0);
      return btns;
    });
    fireEvent.click(arrangeBtns[0]!);
    await waitFor(() => {
      // 弹窗标题包含 commissionCode，无法预知，用 contains 检测前缀
      expect(screen.getByRole("heading", { name: /任务安排 —/ })).toBeTruthy();
    });
  });
});
