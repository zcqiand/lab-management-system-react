// tests/helpers/real-chain.ts —— Task 8 dom 测试真链路基座（msw 剔除 Phase 2）。
//
// 与 tests/helpers/seed.ts（msw fixtures 适配层，T9 才收编）的关系：
//   本文件服务「拆 msw、直连真 nextjs :5201」的重写批（T8 7 文件，T9 沿用），
//   提供三件事：
//     1. `installRealChain()`：register msw 通配 passthrough（use() 头插优先级
//        最高，覆盖 lab-msw 全部 handler）——setup.dom.ts 仍会 listen msw node
//        server（其余 17 个 msw 测试共用，本任务不许动），passthrough 让本批
//        测试的请求穿透到真服务（jsdom url 与 baseUrl 同源 :5201，T7 实测结论）。
//     2. token 双通道（globalSetup provide("TEST_TOKEN") / process.env，任一在
//        即可）：注入 legacy-client 拦截器 + auth-context 的 localStorage 契约 key
//        （main.tsx bootstrap 在测试里不跑，需自行接桥）。
//     3. `SEED` 锚：shared 种子 JSON（DB 快照权威源，globalSetup 每次跑前 upsert
//        灌库）。断言一律锚定种子行的固定 id/字段，不许断言易变业务值。
import { http, passthrough } from "msw";
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

/** setup.dom.ts 导出的 msw node server 窄接口（只用到 use）。 */
type MockServer = { use: (...handlers: unknown[]) => void };

/**
 * 把当前 jsdom 测试文件切到真链路：
 *  - msw 通配 passthrough（必须在每个 beforeEach 重装——setup.dom.ts 的
 *    afterEach 会 resetHandlers() 清掉 use() 覆盖）；
 *  - token 注入（axios 拦截器 callback + localStorage 契约 key，afterEach 的
 *    localStorage.clear() 之后这里重新写回）。
 */
export function installRealChain(server: MockServer): void {
  // 真链路延迟预算（本机实测 2026-09-16）：lab_dev DATABASE_URL 指远程 PG
  //（100.79.128.25，TCP RTT ~240ms/roundtrip），单条 list 请求 1~2.5s、
  // objects 聚合列路由冷跑可到 ~17s；RTL waitFor 默认 1s 必超时 → 30s。
  // vitest it 级 timeout 仍保持 config 默认 10s 不动（禁全文件放宽）——
  // 撞远程 PG 多 RTT 的个别 it 由各文件显式传 { timeout } 放宽（CI 服务容器
  // PG 在本机，全部测试亚秒跑完，timeout 形同虚设）。
  configure({ asyncUtilTimeout: 30_000 });
  server.use(http.all("*", () => passthrough()));
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
