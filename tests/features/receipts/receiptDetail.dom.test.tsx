import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { fnTest } from "../../fn";
import { installRealChain, SEED } from "../../helpers/real-chain";
import { server } from "../../setup.dom";
import { ReceiptDetail } from "@/features/receipts/ReceiptDetail";

/**
 * M03.F09 接样单详情 smoke —— 真链路（msw passthrough，直连真 nextjs :5201）。
 *
 * 数据源：lab_dev.sample_receipts（GET /api/receipts/:id）。
 * 锚定 shared 种子首行 RECEIPT-FM-0001（globalSetup 每次跑前 upsert，固定 id +
 * 固定 commission_code WS-2026-F0001；receiving 行，flow_history 为空）。
 */

const TARGET = SEED.receipts.find((r) => r.id === "RECEIPT-FM-0001")!;
const TARGET_CODE = TARGET.commission_code;

beforeEach(() => {
  installRealChain(server);
});

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/receipts/${id}`]}>
      <Routes>
        <Route path="/receipts/:id" element={<ReceiptDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("M03.F09 接样单详情", () => {
  fnTest(
    ["M03.F09.I01"],
    "接样单详情：渲染标题 + 字段区（真库种子行穿透）",
    { timeout: 45_000 },
    async () => {
      renderDetail(TARGET.id);
      // 种子锚：标题渲染种子行固定委托书编号 + 字段区标签在场
      await waitFor(() => {
        expect(screen.getByText(`接样单详情 — ${TARGET_CODE}`)).toBeTruthy();
      });
      expect(screen.getByText("委托书编号：")).toBeTruthy();
      expect(screen.getByText(TARGET.test_category ?? "见证取样")).toBeTruthy();
    },
  );

  fnTest(
    ["M03.F09.I02"],
    "接样单详情：流程历史时间线卡片可见（空种子时显示占位）",
    { timeout: 45_000 },
    async () => {
      renderDetail(TARGET.id);
      await waitFor(() => {
        expect(screen.getByText("流程历史")).toBeTruthy();
      });
    },
  );

  fnTest(
    ["M03.F09.I03"],
    "接样单详情：报告预览按钮开弹窗",
    { timeout: 45_000 },
    async () => {
      renderDetail(TARGET.id);
      await waitFor(() => {
        expect(screen.getByText(`接样单详情 — ${TARGET_CODE}`)).toBeTruthy();
      });
      fireEvent.click(screen.getByRole("button", { name: "报告预览" }));
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: `报告预览 — ${TARGET_CODE}` }),
        ).toBeTruthy();
      });
    },
  );
});
