// M06.F03.I02 fnTest — 参数↔标准关联（ParameterStandardLinkDialog toggle）。
//
// InspectionCapabilityList parameters 资源行内「关联标准」→ 弹窗列出标准 →
// toggle POST/DELETE /api/inspection/links/standard-parameter（真链路，msw 已拆）。
//
// 隔离纪律：nextjs 的 links 端点读写进程内 fixtures 数组（无 DB 落库），
// toggle POST 会在进程内存里残留关联行——afterEach 按精确 pair DELETE 回收，
// beforeEach 兜底清场（上次异常中断残留），保证种子锚关联态可复现。
import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import {
  installRealChain,
  SEED,
  firstUnlinkedStandardFor,
} from "../../helpers/real-chain";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import { ParameterStandardLinkDialog } from "@/features/inspection-capability/ParameterStandardLinkDialog";

/** 种子锚参数：IP-0001（凝结时间），GB 175-2023 在种子中已关联它。 */
const PARAM = SEED.inspectionParameters.find((p) => p.code === "IP-0001")!;
const LINKED_STD = "GB 175-2023";
/** toggle 目标：种子层面未关联的首个标准编码（纯种子计算，确定性）。 */
const TOGGLE_TARGET = firstUnlinkedStandardFor(PARAM.code);

/**
 * 按 pair 精确解除关联（测试隔离专用）。
 *
 * 注意走 **query 参数** 而非 body：真后端 nextjs 的 linkDelete 只读
 * searchParams（body 形态会退化为「删数组首行」的破坏性误删——见 task-9
 * 报告「组件↔后端 DELETE 契约漂移」）。组件的 body 形态能否解除是那个
 * 待裁问题，本文件的用例与隔离设施都不依赖它。
 */
function unlinkPair(stdCode: string): Promise<unknown> {
  const qs = new URLSearchParams({
    inspectionStandardCode: stdCode,
    inspectionParameterCode: PARAM.code,
  }).toString();
  return apiClient.delete(`${API_ROUTES["/inspection-standard-parameters"]}?${qs}`);
}

beforeEach(async () => {
  installRealChain();
  // 清场：toggle 目标 pair 若因上次异常中断残留在 nextjs 进程内，先解除
  await unlinkPair(TOGGLE_TARGET).catch(() => {});
});

afterEach(async () => {
  // 回收 toggle 产生的关联行（nextjs 进程内存不随测试复位）
  await unlinkPair(TOGGLE_TARGET).catch(() => {});
});

function renderDialog() {
  return render(
    <ParameterStandardLinkDialog
      open
      onOpenChange={() => {}}
      parameterCode={PARAM.code}
      parameterName={PARAM.name}
      onChanged={() => {}}
    />,
  );
}

describe("M06.F03.I02 参数↔标准关联", () => {
  fnTest(
    ["M06.F03.I02"],
    `关联弹窗：列出标准 + 已关联态（${PARAM.code} 已关联 ${LINKED_STD}，种子真数据穿透）`,
    { timeout: 45_000 },
    async () => {
      renderDialog();
      // 种子锚：GB 175-2023 在 shared 种子已关联 IP-0001 → 按钮初始即「解除关联」
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: `解除关联 ${LINKED_STD}` }),
        ).toBeTruthy();
      });
      expect(screen.getByText(`关联标准 — ${PARAM.name}`)).toBeTruthy();
      // 种子全量 103 标准逐行渲染，每行都有 toggle 按钮
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /^(关联|解除关联) / }).length,
        ).toBeGreaterThanOrEqual(SEED.inspectionStandards.length);
      });
    },
  );

  fnTest(
    ["M06.F03.I02"],
    `toggle：未关联标准 ${TOGGLE_TARGET} → POST 后按钮翻「解除关联」`,
    { timeout: 45_000 },
    async () => {
      renderDialog();
      const btn = await waitFor(() => {
        const b = screen.getByRole("button", { name: `关联 ${TOGGLE_TARGET}` });
        expect(b).toBeTruthy();
        return b;
      });
      fireEvent.click(btn);
      // POST 成功后按钮翻转为解除关联（即时保存语义）
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: `解除关联 ${TOGGLE_TARGET}` }),
        ).toBeTruthy();
      });
    },
  );
});
