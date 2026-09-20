// Smoke test: verify orval-generated API client from shared contract is wired.
// 非 DOM 单元测试（vitest environment: node）；只断言代码生成产物存在。
//
// spec §2.1：orval tags-split 后端点拆多文件，按 shared 的 @tag 拆分。
// 此处按 tag 分别 import 验证产物存在。
import { describe, expect } from "vitest";
import { fnTest } from "./fn";
import * as auth from "../src/api/endpoints/auth/auth";
import * as contracts from "../src/api/endpoints/contracts/contracts";
import * as receipts from "../src/api/endpoints/receipts/receipts";
import * as inspectionCatalog from "../src/api/endpoints/inspection-catalog/inspection-catalog";
import * as summary from "../src/api/endpoints/summary/summary";
import * as inspectionDictionary from "../src/api/endpoints/inspection-dictionary/inspection-dictionary";
import * as reportNames from "../src/api/endpoints/report-names/report-names";

describe("shared contract client smoke", () => {
  fnTest(["M01.F05.I01"], "auth login endpoint generated", () => {
    expect(typeof auth.authLogin).toBe("function");
  });

  fnTest(["M02.F01.I01"], "contract list endpoint generated", () => {
    expect(typeof contracts.contractsListContracts).toBe("function");
  });

  fnTest(["M03.F01.I01"], "receipt list endpoint generated", () => {
    expect(typeof receipts.receiptsListReceipts).toBe("function");
  });

  fnTest(["M04.F09.I01"], "brand list endpoint generated", () => {
    expect(typeof inspectionCatalog.catalogListBrands).toBe("function");
  });

  fnTest(["M05.F01.I01"], "summary endpoint generated", () => {
    expect(typeof summary.summaryGetReportSummary).toBe("function");
  });

  fnTest(["M05.F01.I06"], "stats endpoint generated", () => {
    expect(typeof summary.summaryGetDashboardStats).toBe("function");
  });

  fnTest(["M06.F01.I01"], "inspection specialty endpoint generated", () => {
    expect(typeof inspectionDictionary.inspectionDictionaryListSpecialties).toBe(
      "function",
    );
  });

  fnTest(["M06.F04.I02"], "inspection standard create endpoint generated", () => {
    expect(typeof inspectionDictionary.inspectionDictionaryCreateStandard).toBe(
      "function",
    );
  });

  fnTest(["M06.F07.I01"], "report name endpoint generated", () => {
    expect(typeof reportNames.reportNamesListReportNames).toBe("function");
  });
});
