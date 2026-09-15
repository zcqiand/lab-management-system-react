import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { installRealChain, SEED } from "../../helpers/real-chain";
import { server } from "../../setup.dom";
import { ContractsList } from "@/features/contracts/ContractsList";

/**
 * M02.F01 合同管理 smoke —— 真链路（msw passthrough，直连真 nextjs :5201）。
 *
 * GET /api/contracts 已是 REF 形状 {items,page,pageSize,total} + status/keyword
 * 过滤（零适配直连）。数据源是 nextjs 进程内契约 fixtures（探针实测与 shared
 * 种子同一份 3 行：CONTRACT-001/002/003），断言锚 shared 种子固定合同编号。
 * 本批用例只开弹窗不落写，无隔离负担。
 */

beforeEach(() => {
  installRealChain(server);
});

describe("M02.F01 合同管理", () => {
  fnTest(
    ["M02.F01.I01"],
    "合同列表：渲染标题 + 列表行（真后端契约数据穿透）",
    { timeout: 45_000 },
    async () => {
      render(<ContractsList />);
      expect(screen.getByText("合同管理")).toBeTruthy();
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      // 种子锚：种子 3 份合同的编号至少渲染出一份（CONTRACT-001 固定在场）
      const seedCodes = SEED.contracts.map((c) => c.contract_code);
      expect(seedCodes.length).toBeGreaterThan(0);
      expect(screen.getByText(seedCodes[0]!)).toBeTruthy();
    },
  );

  fnTest(["M02.F01.I02"], "合同管理：新建按钮开弹窗", { timeout: 45_000 }, async () => {
    render(<ContractsList />);
    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    });
    fireEvent.click(screen.getByRole("button", { name: "新建合同" }));
    await waitFor(() => {
      expect(screen.getByText("新建合同", { selector: "h2" })).toBeTruthy();
    });
  });

  fnTest(
    ["M02.F01.I03"],
    "合同管理：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(<ContractsList />);
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
        // 弹窗标题（h3）渲染即视为开
        expect(screen.getByRole("heading", { name: "删除合同" })).toBeTruthy();
      });
    },
  );
});
