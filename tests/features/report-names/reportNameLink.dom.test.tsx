// M06.F07.I02 fnTest — 报告名称↔标准/参数关联（ReportNameLinkDialog toggle）。
//
// 报告名称列表行内「关联」→ 弹窗两段列表（标准 role=TESTING / 参数）→
// toggle POST/DELETE /api/report-names/links/{standard,parameter}
// （真链路，msw 已拆）。
//
// 隔离纪律：nextjs 的 links 端点读写进程内 fixtures 数组（无 DB 落库），
// toggle POST 会在进程内存里残留关联行——afterEach 按精确 pair DELETE 回收，
// beforeEach 兜底清场（上次异常中断残留），保证种子锚关联态可复现。
// 清理走 **query 参数**（真后端 linkDelete 只读 searchParams，见 task-9
// 报告「组件↔后端 DELETE 契约漂移」）。
import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { installRealChain, firstUnlinkedParameterFor } from "../../helpers/real-chain";
import axios from "axios";
import { ReportNameLinkDialog } from "@/features/report-names/ReportNameLinkDialog";

/** 种子锚报告名称：RN-101（水泥），标准/参数两侧在种子中均有关联。 */
const REPORT_NAME = "RN-101";
/** toggle 目标：种子层面未关联的首个参数编码（纯种子计算，确定性）。 */
const TOGGLE_TARGET = firstUnlinkedParameterFor(REPORT_NAME);

function unlinkParamPair(): Promise<unknown> {
  const qs = new URLSearchParams({
    reportNameCode: REPORT_NAME,
    inspectionParameterCode: TOGGLE_TARGET,
  }).toString();
  // 契约路径 /api/report-names/links/parameter（与 orval 生成物一致）；
  // installRealChain() 装好的拦截器会给这个裸 axios 实例补 baseURL/token。
  return axios.delete(`/api/report-names/links/parameter?${qs}`);
}

// hook 级 30s：清场/回收 DELETE 走 :5201→远程 PG 多 RTT，与下方 it 级 45s
// 放宽同源（真链路延迟预算见 tests/helpers/real-chain.ts 文件头）
beforeEach(async () => {
  installRealChain();
  // 清场：toggle 目标 pair 若因上次异常中断残留在 nextjs 进程内，先解除
  await unlinkParamPair().catch(() => {});
}, 30_000);

afterEach(async () => {
  // 回收 toggle 产生的关联行（nextjs 进程内存不随测试复位）
  await unlinkParamPair().catch(() => {});
}, 30_000);

function renderDialog() {
  return render(
    <ReportNameLinkDialog
      open
      onOpenChange={() => {}}
      reportNameCode={REPORT_NAME}
      reportNameLabel="检测报告"
      onChanged={() => {}}
    />,
  );
}

describe("M06.F07.I02 报告名称↔标准/参数关联", () => {
  fnTest(
    ["M06.F07.I02"],
    // 90s 档（同 receiptsList 首用例）：两段列表 = standards + parameters 两次
    // 聚合请求，:5201 冷编译 + 远程 PG 多 RTT 实测可到 ~56s
    "关联弹窗：两段列表渲染（标准 + 参数，真后端种子数据穿透）",
    { timeout: 90_000 },
    async () => {
      renderDialog();
      await waitFor(() => {
        // aria-label 形如「关联标准 GB 175-2023」/「解除参数 IP-0001」
        expect(
          screen.getAllByRole("button", { name: /^(关联|解除)(标准|参数) / }).length,
        ).toBeGreaterThan(1);
      });
      // 种子锚：RN-101 两侧关联非空（shared 种子 209 标准 / 261 参数关联行覆盖）
      expect(screen.getByText("关联维护 — 检测报告")).toBeTruthy();
      expect(screen.getByText("检测标准（role=检测）")).toBeTruthy();
      expect(screen.getByText("检测参数")).toBeTruthy();
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /^解除标准 / }).length,
        ).toBeGreaterThan(0);
        expect(
          screen.getAllByRole("button", { name: /^解除参数 / }).length,
        ).toBeGreaterThan(0);
      });
    },
  );

  fnTest(
    ["M06.F07.I02"],
    `toggle 参数：未关联参数 ${TOGGLE_TARGET} → POST 后按钮翻「解除」`,
    // 弹窗首帧要等参数列表（DB 参照路由，587 行，全量并发下实测 >30s）+
    // 关联集合两路请求——全局 30s asyncUtilTimeout 会先耗尽，本用例
    // waitFor 单独给 60s、it 给 90s 档（同 receiptsList 慢用例外例）。
    { timeout: 90_000 },
    async () => {
      renderDialog();
      const btn = await waitFor(
        () => {
          const b = screen.getByRole("button", { name: `关联参数 ${TOGGLE_TARGET}` });
          expect(b).toBeTruthy();
          return b;
        },
        { timeout: 60_000 },
      );
      fireEvent.click(btn);
      // POST 成功后按钮翻转为解除参数（即时保存语义）
      await waitFor(
        () => {
          expect(
            screen.getAllByRole("button", { name: `解除参数 ${TOGGLE_TARGET}` }),
          ).toHaveLength(1);
        },
        { timeout: 60_000 },
      );
    },
  );
});
