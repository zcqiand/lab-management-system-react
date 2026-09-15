import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { fnTest } from "../../fn";
import {
  installRealChain,
  renderedCommissionCodes,
  SEED,
} from "../../helpers/real-chain";
import { server } from "../../setup.dom";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import { ReceiptsList } from "@/features/receipts/ReceiptsList";

/**
 * M03.F01 接样管理 smoke —— 真链路（msw passthrough，直连真 nextjs :5201）。
 *
 * 数据源：lab_dev.sample_receipts（globalSetup 每次跑前 upsert shared 种子，
 * receiving 行种子保证 24 条非空）。写路径（POST /api/receipts/flow）用
 * TEST- 前缀新建行承载：commissionDate=2099 使其稳定排在列表首位，
 * afterEach 删行回收，不触碰任何种子行。
 */

beforeEach(async () => {
  installRealChain(server);
  // 清扫上次异常中断残留的 TEST 行（幂等隔离；正常路径 afterEach 已删）
  const stale = await apiClient.get<{ items: Array<{ id: string }> }>(
    API_ROUTES["/receipts"],
    { params: { keyword: "WS-TEST-T8", page: 1, pageSize: 100 } },
  );
  for (const row of stale.data.items) {
    await apiClient.delete(`${API_ROUTES["/receipts"]}/${row.id}`);
  }
});

describe("M03.F01 接样管理", () => {
  // 写路径隔离：TEST 行按精确 id 回收（POST 由服务端生成 id，客户端持有）
  let createdId: string | null = null;
  afterEach(async () => {
    if (createdId) {
      await apiClient.delete(`${API_ROUTES["/receipts"]}/${createdId}`).catch(() => {});
      createdId = null;
    }
  });

  fnTest(
    ["M03.F01.I01"],
    "接样管理：渲染标题 + 列表行（真库种子数据穿透）",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReceiptsList />
        </MemoryRouter>,
      );
      expect(screen.getByText("接样管理")).toBeTruthy();
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      // 种子锚：渲染出的委托书编号必须 ⊆ shared 种子的全量编号集
      const seedCodes = new Set(SEED.receipts.map((r) => r.commission_code));
      const rendered = renderedCommissionCodes();
      expect(rendered.length).toBeGreaterThan(0);
      for (const code of rendered) expect(seedCodes.has(code)).toBe(true);
    },
  );

  fnTest(["M03.F01.I02"], "接样管理：新建按钮开弹窗", { timeout: 45_000 }, async () => {
    render(
      <MemoryRouter>
        <ReceiptsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    });
    fireEvent.click(screen.getByRole("button", { name: "新建接样" }));
    await waitFor(() => {
      expect(screen.getByText("新建接样", { selector: "h2" })).toBeTruthy();
    });
  });

  fnTest(
    ["M03.F01.I03"],
    "接样管理：行内删除按钮开确认弹窗",
    { timeout: 45_000 },
    async () => {
      render(
        <MemoryRouter>
          <ReceiptsList />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      // 仅 flowStatus='receiving' 的接样单渲染删除按钮（已提交单据走「已提交」占位）
      const delBtns = await waitFor(() => {
        const btns = screen.queryAllByRole("button", { name: "删除" });
        expect(btns.length).toBeGreaterThan(0);
        return btns;
      });
      fireEvent.click(delBtns[0]!);
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "删除接样" })).toBeTruthy();
      });
    },
  );

  fnTest(
    ["M03.F01.I04"],
    "接样管理：提交按钮调真 POST /api/receipts/flow 推进 receiving → task_assignment",
    { timeout: 45_000 },
    async () => {
      // 隔离：新建 TEST 行（不碰种子行），commissionDate 放未来使其稳定排列表首
      const created = await apiClient.post<SampleReceiptDto>(API_ROUTES["/receipts"], {
        contractId: "CONTRACT-001",
        commissionCode: "WS-TEST-T8-0001",
        commissionDate: "2099-12-31",
        projectName: "T8 真链路写路径用例",
        clientUnit: "T8 测试委托单位",
        testCategory: "见证取样",
        sampleSource: "现场",
        categoryCode: "RN-101",
        receivedBy: "t8-tester",
      });
      createdId = created.data.id;
      expect(createdId).toBeTruthy();

      render(
        <MemoryRouter>
          <ReceiptsList />
          {/* App 壳未挂 Toaster（src 零渲染点），测试内补挂验证 toast 行为 */}
          <Toaster />
        </MemoryRouter>,
      );
      // TEST 行 commissionDate=2099 按委托日期倒序必排第一行
      await waitFor(() => {
        expect(screen.getByText("WS-TEST-T8-0001")).toBeTruthy();
      });
      const beforeSubmit = screen.queryAllByRole("button", { name: "提交" }).length;
      const submitBtns = await waitFor(() => {
        const btns = screen.queryAllByRole("button", { name: "提交" });
        expect(btns.length).toBeGreaterThan(0);
        return btns;
      });
      fireEvent.click(submitBtns[0]!);
      // 真 flow 落库：toast 成功提示 + 该行提交按钮随列表刷新消失
      await waitFor(() => {
        expect(screen.getByText("接样单已提交到任务安排")).toBeTruthy();
      });
      await waitFor(() => {
        expect(screen.queryAllByRole("button", { name: "提交" }).length).toBe(
          beforeSubmit - 1,
        );
      });
      const after = await apiClient.get<SampleReceiptDto>(
        `${API_ROUTES["/receipts"]}/${createdId}`,
      );
      expect(after.data.flowStatus).toBe("task_assignment");
    },
  );
});

interface SampleReceiptDto {
  id: string;
  flowStatus: string;
  commissionCode: string;
}
