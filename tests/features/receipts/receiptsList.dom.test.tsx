import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { fnTest } from "../../fn";
import {
  installRealChain,
  renderedCommissionCodes,
  seedCommissionCodes,
} from "../../helpers/real-chain";
import {
  receiptsCreateReceipt,
  receiptsDeleteReceipt,
  receiptsGetReceipt,
  receiptsListReceipts,
} from "@/api/endpoints/receipts/receipts";
import { ReceiptsList } from "@/features/receipts/ReceiptsList";

/**
 * M03.F01 接样管理 smoke —— 真链路（直连真 nextjs :5201，msw 已拆）。
 *
 * 数据源：lab_dev.sample_receipts（globalSetup 每次跑前 upsert shared 种子，
 * receiving 行种子保证 24 条非空）。写路径（POST /api/receipts/receiving/act）
 * 用 TEST- 前缀新建行承载：commissionDate=2099 使其稳定排在列表首位，
 * afterEach 删行回收，不触碰任何种子行。
 */

// hook 级 30s：清场 list + 逐行 DELETE 走 :5201→远程 PG 多 RTT，与下方
// it 级 45s/90s 放宽同源（真链路延迟预算见 tests/helpers/real-chain.ts 文件头）
beforeEach(async () => {
  installRealChain();
  // 清扫上次异常中断残留的 TEST 行（幂等隔离；正常路径 afterEach 已删）
  const stale = await receiptsListReceipts({
    keyword: "WS-TEST-T8",
    page: 1,
    pageSize: 100,
  });
  for (const row of stale.data.items) {
    await receiptsDeleteReceipt(row.id);
  }
}, 30_000);

describe("M03.F01 接样管理", () => {
  // 写路径隔离：TEST 行按精确 id 回收（POST 由服务端生成 id，客户端持有）
  let createdId: string | null = null;
  afterEach(async () => {
    if (createdId) {
      await receiptsDeleteReceipt(createdId).catch(() => {});
      createdId = null;
    }
  }, 30_000);

  fnTest(
    ["M03.F01.I01"],
    "接样管理：渲染标题 + 列表行（真库种子数据穿透，接样中阶段级 subset）",
    // receipts 是全家族最大表（种子 210 行）+ 本用例两轮 list 加载（默认页
    // + receiving 过滤页），远程 PG 多 RTT 实测可到 ~50s —— 全文件唯一
    // 90s 档的用例（CI 服务容器本机 PG 亚秒跑完，不受影响）。
    { timeout: 90_000 },
    async () => {
      const { container } = render(
        <MemoryRouter>
          <ReceiptsList />
        </MemoryRouter>,
      );
      expect(screen.getByText("接样管理")).toBeTruthy();
      await waitFor(() => {
        expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
      });
      // 种子锚（阶段级 subset，与 dataEntry/reports/taskAssignment 对齐）：
      // 切到「接样中」过滤（flowStatus=receiving）后，渲染出的委托书编号
      // 必须 ⊆ shared 种子的 receiving 编号集。默认「全部状态」页混有全部
      // 阶段的种子行，subset 断言只在本页主阶段语义下才有意义。
      const allowed = seedCommissionCodes("receiving");
      // 切「接样中」过滤：组件语义是 select 只改 state，点「搜索」才 refetch
      // （onFlowFilterChange={setFlowFilter}，onSearch={() => void load()}）——
      // 与真用户操作同构；只 change 不点搜索列表永远停在「全部状态」页。
      fireEvent.change(container.querySelector("select")!, {
        target: { value: "receiving" },
      });
      fireEvent.click(screen.getByRole("button", { name: "搜索" }));
      // 第二轮 list 加载在首轮渲染之后才触发，慢时 ~20s+ ——这轮 waitFor
      // 从 ~20s 才开始，全局 30s asyncUtilTimeout 不够，单独给 60s。
      await waitFor(
        () => {
          const rendered = renderedCommissionCodes();
          expect(rendered.length).toBeGreaterThan(0);
          for (const code of rendered) expect(allowed.has(code)).toBe(true);
        },
        { timeout: 60_000 },
      );
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
    "接样管理：提交按钮调真 POST /api/receipts/receiving/act 推进 receiving → task_assignment",
    // 写路径最重用例：建行 + 渲染 + flow 提交 + 列表刷新 + 复查 = 5+ 次
    // 远程 PG 多 RTT 请求，实测可到 ~52s —— 与 I01 同档放宽到 90s。
    { timeout: 90_000 },
    async () => {
      // 隔离：新建 TEST 行（不碰种子行），commissionDate 放未来使其稳定排列表首
      const created = await receiptsCreateReceipt({
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
      const after = await receiptsGetReceipt(createdId);
      expect(after.data.flowStatus).toBe("task_assignment");
    },
  );
});
