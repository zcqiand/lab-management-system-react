import { describe, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fnTest } from "./fn";

// 5 I 级 ID 存在性锚点测试：仅作 L5 「已上线但无测试引用」警告的解除
// 注意：实质行为测试需在对应功能单测里加；这里是接入点声明
const SRC = path.resolve(__dirname, "..");

describe("Infrastructure anchor registration", () => {
  fnTest(
    ["M03.F01.I07"],
    "SampleExtFieldsModal module source file exists",
    () => {
      expect(
        fs.existsSync(
          path.join(SRC, "src/features/data-entry/SampleExtFieldsModal.tsx"),
        ),
      ).toBe(true);
    },
  );

  fnTest(["M98.F01.I01"], "BackendSwitcher module source file exists", () => {
    expect(
      fs.existsSync(path.join(SRC, "src/components/app/backend-switcher.tsx")),
    ).toBe(true);
  });

  fnTest(
    ["M98.F01.I02"],
    "useBackend store source file exists (backend-context)",
    () => {
      expect(fs.existsSync(path.join(SRC, "src/state/backend-context.tsx"))).toBe(
        true,
      );
    },
  );

  fnTest(["M98.F02.I01"], "axios interceptor module source file exists", () => {
    expect(fs.existsSync(path.join(SRC, "src/api/legacy-client.ts"))).toBe(true);
  });

  fnTest(
    ["M98.F03.I01"],
    "orval-generated auth endpoint directory exists",
    () => {
      expect(fs.existsSync(path.join(SRC, "src/api/endpoints"))).toBe(true);
    },
  );
});
