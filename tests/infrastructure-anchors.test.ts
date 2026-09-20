import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fnTest } from "./fn";

// 接入点存在性 smoke（ADR-0033 阶段二：M98 infra 段自 function-tree 退役，
// M98 锚点解挂为普通 it；M03.F01.I07 锚点保留）。
const SRC = path.resolve(__dirname, "..");

describe("Infrastructure anchor registration", () => {
  fnTest(["M03.F01.I07"], "SampleExtFieldsModal module source file exists", () => {
    expect(
      fs.existsSync(path.join(SRC, "src/features/data-entry/SampleExtFieldsModal.tsx")),
    ).toBe(true);
  });

  it("BackendBadge module source file exists (replaces BackendSwitcher — ADR-0014)", () => {
    expect(fs.existsSync(path.join(SRC, "src/components/app/backend-badge.tsx"))).toBe(
      true,
    );
  });

  it("axios interceptor module source file exists", () => {
    expect(fs.existsSync(path.join(SRC, "src/api/http-client.ts"))).toBe(true);
  });

  it("orval-generated auth endpoint directory exists", () => {
    expect(fs.existsSync(path.join(SRC, "src/api/endpoints"))).toBe(true);
  });
});
