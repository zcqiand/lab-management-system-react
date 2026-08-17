// 土工类模型卡（soil-compaction / soil-compaction-degree）dom + 算法测试。

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { fnTest } from "../../fn";
import {
  SoilCompactionCard,
  computeCompactionPeak,
} from "@/features/data-entry/models/SoilCompactionCard";
import {
  SoilCompactionDegreeCard,
  computeCompactionDegree,
} from "@/features/data-entry/models/SoilCompactionDegreeCard";
import type { ParamModelProps } from "@/features/data-entry/models/types";
import type { InspectionParameter } from "@/types/api";

const param = (
  code: string,
  name: string,
  unit?: string,
): InspectionParameter =>
  ({
    id: code,
    code,
    name,
    rawName: name,
    canonicalName: name,
    aliases: [],
    unit,
    sourceType: "official",
    sortOrder: 1,
    createdAt: "",
    updatedAt: "",
  }) as InspectionParameter;

function makeProps(over: Partial<ParamModelProps> = {}): ParamModelProps {
  return {
    parameter: param("IP-0226", "最大干密度"),
    record: undefined,
    sampleId: "s1",
    standards: [],
    stdParams: [],
    techReqs: [],
    config: undefined,
    onChange: vi.fn(),
    readOnly: false,
    ...over,
  };
}

describe("computeCompactionPeak 二次拟合", () => {
  it("有效点 < 3 → 回退实测最大干密度点", () => {
    const r = computeCompactionPeak([
      { moisture: 10, dryDensity: 1.8 },
      { moisture: 12, dryDensity: 1.85 },
    ]);
    expect(r.maxDryDensity).toBe(1.85);
    expect(r.optimalMoisture).toBe(12);
  });

  it("3+ 点峰值在中间 → 二次拟合顶点", () => {
    const r = computeCompactionPeak([
      { moisture: 8, dryDensity: 1.7 },
      { moisture: 12, dryDensity: 1.9 },
      { moisture: 16, dryDensity: 1.8 },
    ]);
    expect(r.maxDryDensity).toBeGreaterThan(1.9);
    expect(r.optimalMoisture).toBeGreaterThan(11);
    expect(r.optimalMoisture).toBeLessThan(13);
  });

  it("全部 0 → undefined", () => {
    const r = computeCompactionPeak([
      { moisture: 0, dryDensity: 0 },
      { moisture: 0, dryDensity: 0 },
    ]);
    expect(r.maxDryDensity).toBeUndefined();
    expect(r.optimalMoisture).toBeUndefined();
  });
});

describe("computeCompactionDegree", () => {
  it("缺输入 → 干密度/压实度 = 0，verdict = ''", () => {
    const r = computeCompactionDegree(
      { code: "", part: "", layer: "", designDegree: 96, wetDensity: 0, moisture: 0 },
      1.9,
    );
    expect(r.dryDensity).toBe(0);
    expect(r.degree).toBe(0);
    expect(r.verdict).toBe("");
  });

  it("湿密度 1.92，含水率 10% → 干密度 ≈ 1.745，压实度 ≈ 91.8%（1.9 最大干密度）", () => {
    const r = computeCompactionDegree(
      { code: "", part: "", layer: "", designDegree: 96, wetDensity: 1.92, moisture: 10 },
      1.9,
    );
    expect(r.dryDensity).toBeCloseTo(1.745, 2);
    expect(r.degree).toBeCloseTo(91.8, 1);
    expect(r.verdict).toBe("不合格"); // 91.8 < 96
  });

  it("压实度达标 → 合格", () => {
    const r = computeCompactionDegree(
      { code: "", part: "", layer: "", designDegree: 96, wetDensity: 2.0, moisture: 5 },
      1.9,
    );
    expect(r.verdict).toBe("合格");
  });
});

describe("SoilCompactionCard 渲染", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "SoilCompactionCard 渲染 5 组（默认 pointCount=5）+ GB/T 50123-2019 标识", () => {
    const { container } = render(<SoilCompactionCard {...makeProps()} />);
    expect(
      container.querySelectorAll('input[aria-label^="第"][aria-label$="组含水率"]').length,
    ).toBe(5);
    expect(container.textContent).toContain("GB/T 50123-2019");
  });

  fnTest(["M03.F03.I02"], "SoilCompactionCard 录入含水率 + 干密度 → 最大干密度上屏", () => {
    const { container } = render(<SoilCompactionCard {...makeProps()} />);
    const moistureInputs = container.querySelectorAll<HTMLInputElement>(
      'input[aria-label^="第"][aria-label$="组含水率"]',
    );
    const densityInputs = container.querySelectorAll<HTMLInputElement>(
      'input[aria-label^="第"][aria-label$="组干密度"]',
    );
    act(() => {
      [
        [10, 1.7],
        [12, 1.9],
        [14, 1.8],
      ].forEach(([w, d], i) => {
        fireEvent.change(moistureInputs[i]!, { target: { value: String(w) } });
        fireEvent.change(densityInputs[i]!, { target: { value: String(d) } });
      });
    });
    expect(screen.getByTestId("max-dry-density").textContent).toBeTruthy();
    expect(screen.getByTestId("optimal-moisture").textContent).toBeTruthy();
  });
});

describe("SoilCompactionDegreeCard 渲染", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "SoilCompactionDegreeCard 渲染 6 行（默认 rowCount=6）+ 最大干密度输入", () => {
    const { container } = render(<SoilCompactionDegreeCard {...makeProps()} />);
    expect(
      container.querySelectorAll('input[aria-label^="第"][aria-label$="行试样编号"]').length,
    ).toBe(6);
    expect(container.querySelector('input[aria-label="最大干密度"]')).toBeTruthy();
  });

  fnTest(["M03.F03.I02"], "SoilCompactionDegreeCard 录入湿密度 + 含水率 → 干密度 + 压实度上屏", () => {
    const { container } = render(<SoilCompactionDegreeCard {...makeProps()} />);
    const maxDia = container.querySelector<HTMLInputElement>('input[aria-label="最大干密度"]')!;
    const wetDensity = container.querySelectorAll<HTMLInputElement>(
      'input[aria-label^="第"][aria-label$="行湿密度"]',
    );
    const moisture = container.querySelectorAll<HTMLInputElement>(
      'input[aria-label^="第"][aria-label$="行含水率"]',
    );
    act(() => {
      fireEvent.change(maxDia, { target: { value: "1.9" } });
      fireEvent.change(wetDensity[0]!, { target: { value: "1.92" } });
      fireEvent.change(moisture[0]!, { target: { value: "10" } });
    });
    expect(screen.getByTestId("dry-density-0").textContent).toBeTruthy();
    expect(screen.getByTestId("degree-0").textContent).toBeTruthy();
  });
});