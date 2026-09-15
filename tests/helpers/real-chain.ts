// tests/helpers/real-chain.ts —— dom 测试真链路基座（msw 剔除 Phase 2，T8/T9 终态）。
//
// msw 拦截层已全仓拆除（setup.dom.ts 不再起 msw node server）：jsdom 请求
// 同源直连真 nextjs :5201（jsdom url 与 baseUrl 同源，T7 实测结论）。
// 本文件提供三件事：
//   1. `installRealChain()`：token 双通道（globalSetup provide("TEST_TOKEN") /
//      process.env，任一在即可）：注入 legacy-client 拦截器 + auth-context 的
//      localStorage 契约 key（main.tsx bootstrap 在测试里不跑，需自行接桥）。
//   2. 真链路延迟预算：远程 PG / nextjs 惰性编译的 it 级 timeout 由各测试文件
//      显式传 { timeout } 放宽（禁全文件放宽）；RTL waitFor 统一 30s。
//   3. `SEED` 锚：shared 种子 JSON（DB 快照权威源，globalSetup 每次跑前 upsert
//      灌库）。断言一律锚定种子行的固定 id/字段，不许断言易变业务值。
import { inject } from "vitest";
import { configure } from "@testing-library/react";
import { installLegacyClient } from "@/api/legacy-client";
import { TOKEN_STORAGE_KEYS } from "@/api/contracts";

// globalSetup 双通道之一：provide("TEST_TOKEN", token) 的消费类型声明
declare module "vitest" {
  interface ProvidedContext {
    TEST_TOKEN: string;
  }
}

import receiptsSeedJson from "../../../lab-management-system-shared/seeds/sample_receipts.json";
import contractsSeedJson from "../../../lab-management-system-shared/seeds/contracts.json";
import objectsSeedJson from "../../../lab-management-system-shared/seeds/inspection_objects.json";
import brandsSeedJson from "../../../lab-management-system-shared/seeds/inspection_brands.json";
import standardsSeedJson from "../../../lab-management-system-shared/seeds/inspection_standards.json";
import parametersSeedJson from "../../../lab-management-system-shared/seeds/inspection_parameters.json";
import standardParametersSeedJson from "../../../lab-management-system-shared/seeds/inspection_standard_parameters.json";
import reportNameParametersSeedJson from "../../../lab-management-system-shared/seeds/inspection_report_name_parameters.json";

/**
 * 把当前 jsdom 测试文件切到真链路：
 *  - token 注入（axios 拦截器 callback + localStorage 契约 key，afterEach 的
 *    localStorage.clear() 之后这里重新写回）；
 *  - RTL waitFor 预算放宽（真链路延迟见文件头）。
 */
export function installRealChain(): void {
  // 真链路延迟预算（本机实测 2026-09-16）：lab_dev DATABASE_URL 指远程 PG
  //（100.79.128.25，TCP RTT ~240ms/roundtrip），单条 list 请求 1~2.5s、
  // objects 聚合列路由冷跑可到 ~17s；RTL waitFor 默认 1s 必超时 → 30s。
  // vitest it 级 timeout 仍保持 config 默认 10s 不动（禁全文件放宽）——
  // 撞远程 PG 多 RTT 的个别 it 由各文件显式传 { timeout } 放宽（CI 服务容器
  // PG 在本机，全部测试亚秒跑完，timeout 形同虚设）。
  configure({ asyncUtilTimeout: 30_000 });
  const token = testToken();
  installLegacyClient(() => token);
  localStorage.setItem(TOKEN_STORAGE_KEYS.accessToken, token);
}

/** token 双通道：process.env（forks pool 继承）优先，回落 vitest inject。 */
export function testToken(): string {
  const fromEnv = process.env["TEST_TOKEN"];
  if (fromEnv) return fromEnv;
  try {
    const injected: unknown = inject("TEST_TOKEN");
    return typeof injected === "string" ? injected : "";
  } catch {
    return "";
  }
}

// ————————————————————————————————————————————————
// SEED 锚（shared seeds/*.json，snake_case 原样出库）
// ————————————————————————————————————————————————

export interface SeedReceiptRow {
  id: string;
  commission_code: string;
  flow_status: string;
  test_category: string;
}

export interface SeedContractRow {
  id: string;
  contract_code: string;
}

export const SEED = {
  receipts: receiptsSeedJson as unknown as SeedReceiptRow[],
  contracts: contractsSeedJson as unknown as SeedContractRow[],
  inspectionObjects: objectsSeedJson as unknown as Array<{
    code: string;
    name: string;
  }>,
  inspectionBrands: brandsSeedJson as unknown as Array<{
    code: string;
    inspection_object_code: string;
    name: string;
  }>,
  inspectionStandards: standardsSeedJson as unknown as Array<{
    code: string;
    name: string;
  }>,
  inspectionParameters: parametersSeedJson as unknown as Array<{
    code: string;
    name: string;
  }>,
  /** 标准↔参数关联（弹窗「已关联态」断言与 toggle 目标选取的种子锚） */
  inspectionStandardParameters: standardParametersSeedJson as unknown as Array<{
    inspection_standard_code: string;
    inspection_parameter_code: string;
  }>,
  /** 报告名称↔参数关联（ReportNameLinkDialog toggle 目标选取的种子锚） */
  inspectionReportNameParameters: reportNameParametersSeedJson as unknown as Array<{
    report_name_code: string;
    inspection_parameter_code: string;
  }>,
};

/** 某流程阶段的种子委托书编号集合（列表页「渲染行 ⊆ 该阶段种子行」断言用）。 */
export function seedCommissionCodes(flowStatus: string): Set<string> {
  return new Set(
    SEED.receipts
      .filter((r) => r.flow_status === flowStatus)
      .map((r) => r.commission_code),
  );
}

/** 委托书编号字面（WS-2026-Fxxxx / WS-TEST-…）。 */
export const COMMISSION_CODE_RE = /WS-\d{4}-[A-Z]+\d*/;

/** 从当前 DOM 的表格行里取已渲染的委托书编号（列表页第一列都是 Link/文本）。 */
export function renderedCommissionCodes(): string[] {
  return Array.from(document.querySelectorAll("table a, table td"))
    .map((el) => el.textContent ?? "")
    .filter((t) => COMMISSION_CODE_RE.test(t));
}

/** 种子层面某参数已关联的标准编码集合。 */
export function seedLinkedStandards(parameterCode: string): Set<string> {
  return new Set(
    SEED.inspectionStandardParameters
      .filter((l) => l.inspection_parameter_code === parameterCode)
      .map((l) => l.inspection_standard_code),
  );
}

/**
 * 某参数在种子层面**未**关联的首个标准编码（弹窗 toggle POST 用例的确定性目标）。
 * 运行前由测试的 beforeEach DELETE 兜底清场，保证真后端关联态与种子一致。
 */
export function firstUnlinkedStandardFor(parameterCode: string): string {
  const linked = seedLinkedStandards(parameterCode);
  const free = SEED.inspectionStandards
    .map((s) => s.code)
    .filter((c) => !linked.has(c))
    .sort()[0];
  if (!free) {
    throw new Error(`seed 锚失效：参数 ${parameterCode} 关联了全部标准`);
  }
  return free;
}

/**
 * 某报告名称在种子层面**未**关联的首个参数（弹窗 toggle POST 用例的确定性目标）。
 * 运行前由测试的 beforeEach DELETE 兜底清场，保证真后端关联态与种子一致。
 */
export function firstUnlinkedParameterFor(reportNameCode: string): string {
  const linked = new Set(
    SEED.inspectionReportNameParameters
      .filter((l) => l.report_name_code === reportNameCode)
      .map((l) => l.inspection_parameter_code),
  );
  const free = SEED.inspectionParameters
    .map((p) => p.code)
    .filter((c) => !linked.has(c))
    .sort()[0];
  if (!free) {
    throw new Error(`seed 锚失效：报告名称 ${reportNameCode} 关联了全部参数`);
  }
  return free;
}
