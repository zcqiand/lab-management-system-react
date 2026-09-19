// M06.F07 报告名称维护 smoke —— 真链路（直连真 nextjs :5201，msw 已拆）。
//
// GET /api/report-names（wrapDict 补 id=code）数据来自 nextjs 进程内
// fixtures（与 shared 种子同源 30 行）。本组用例只开弹窗不落写，无隔离负担。
import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { installRealChain } from "../../helpers/real-chain";
import { ReportNameList } from "@/features/report-names/ReportNameList";

beforeEach(() => {
  installRealChain();
});

describe("M06.F07 报告名称维护", () => {
  fnTest(
    ["M06.F07.I01"],
    "报告名称：渲染标题 + 列表行（真后端种子数据穿透）",
    { timeout: 45_000 },
    async () => {
      render(<ReportNameList />);
      // B6 加载态：整页 PageLoading 门控后，标题随数据一起出现 → waitFor 断言
      await waitFor(() => {
        expect(screen.getByText("报告名称维护")).toBeTruthy();
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
    },
  );

  fnTest(
    ["M06.F07.I01"],
    "报告名称：新建按钮开弹窗（带 extFields 文本域）",
    { timeout: 45_000 },
    async () => {
      render(<ReportNameList />);
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      fireEvent.click(screen.getByRole("button", { name: "新建报告名称" }));
      await waitFor(() => {
        expect(screen.getByText("新建报告名称", { selector: "h2" })).toBeTruthy();
        expect(screen.getByText("扩展属性 extFields（JSON 数组）")).toBeTruthy();
      });
    },
  );

  fnTest(
    ["M06.F07.I01"],
    "报告名称：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(<ReportNameList />);
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      const delBtns = await waitFor(() => {
        const btns = screen.getAllByRole("button", { name: "删除" });
        expect(btns.length).toBeGreaterThan(0);
        return btns;
      });
      fireEvent.click(delBtns[0]!);
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "删除报告名称" })).toBeTruthy();
      });
    },
  );
});
