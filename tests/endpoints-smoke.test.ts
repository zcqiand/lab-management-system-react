// Smoke test: verify orval-generated API client from shared contract is wired.
// 非 DOM 单元测试（vitest environment: node）；只断言代码生成产物存在。
import { describe, expect } from "vitest";
import { fnTest } from "./fn";
import * as api from "../src/api/endpoints/endpoints";

describe("shared contract client smoke", () => {
  fnTest(["M01.F05.I01"], "auth login endpoint generated", () => {
    expect(typeof api.authLogin).toBe("function");
  });

  fnTest(["M02.F01.I01"], "contract list endpoint generated", () => {
    expect(typeof api.contractsListContracts).toBe("function");
  });

  fnTest(["M03.F01.I01"], "receipt list endpoint generated", () => {
    expect(typeof api.receiptsListReceipts).toBe("function");
  });

  fnTest(["M04.F09.I01"], "brand list endpoint generated", () => {
    expect(typeof api.catalogListBrands).toBe("function");
  });

  fnTest(["M05.F01.I01"], "summary endpoint generated", () => {
    expect(typeof api.summaryGetReportSummary).toBe("function");
  });
});
