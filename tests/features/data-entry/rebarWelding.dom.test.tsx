// 钢筋焊接类模型卡（rebar-welding-tensile / rebar-welding-bend）dom + 算法测试。
// 镜像 nextjs 的对应测试。算法模块在 rebar-welding.ts：3 试件共享规格 Φ22，
// 抗拉 Rm = 4000·F/(π·d²)，弯曲按 JGJ/T 27-2014 §6.2。

import { describe, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { fnTest } from "../../fn";
import {
  tensileStrength,
  REBAR_DIAMETER_MM,
  meanOfSpecimen,
  parseTensileRecord,
  parseBendRecord,
  type TensileSpecimen,
} from "@/features/data-entry/models/rebar-welding";
import { RebarWeldingTensileCard } from "@/features/data-entry/models/RebarWeldingTensileCard";
import { RebarWeldingBendCard } from "@/features/data-entry/models/RebarWeldingBendCard";
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
    parameter: param("IP-0087", "抗拉强度"),
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

fnTest(["M03.F03.I01"], "rebar-welding：抗拉 Rm=4000·F/(π·d²)（Φ22）", () => {
  expect(REBAR_DIAMETER_MM).toBe(22);
  // 100 kN → Rm ≈ 263 MPa（按公式 4000·100/(π·484) = 263.16）
  expect(tensileStrength(100, 22)).toBeCloseTo(263.2, 0);
  expect(tensileStrength(0, 22)).toBe(0);
  expect(tensileStrength(100, 0)).toBe(0);
});

fnTest(["M03.F03.I01"], "rebar-welding：meanOfSpecimen 算术平均", () => {
  const spec: TensileSpecimen = {
    techReqId: "",
    techReqLabel: "",
    loads: [100, 110, 120],
    strengths: [
      tensileStrength(100, 22),
      tensileStrength(110, 22),
      tensileStrength(120, 22),
    ],
    fractureDistances: [0, 0, 0],
    fractureCharacteristics: ["", "", ""],
  };
  const m = meanOfSpecimen(spec);
  expect(m).toBeGreaterThan(260);
  expect(m).toBeLessThan(290);
});

fnTest(["M03.F03.I01"], "rebar-welding：parseTensileRecord 反序列化", () => {
  const raw = JSON.stringify({
    loads: [100, 110, 120],
    strengths: [263.2, 289.5, 315.8],
    fractureDistances: [10, 20, 30],
    fractureCharacteristics: ["母材断裂", "焊缝断裂", "热影响区断裂"],
  });
  const p = parseTensileRecord(raw);
  expect(p.loads).toEqual([100, 110, 120]);
  expect(p.strengths).toEqual([263.2, 289.5, 315.8]);
  expect(parseTensileRecord(undefined).loads).toEqual([0, 0, 0]);
  expect(parseTensileRecord("{bad").strengths).toEqual([0, 0, 0]);
});

fnTest(["M03.F03.I01"], "rebar-welding：parseBendRecord 默认 90°+ 合格", () => {
  const b = parseBendRecord(undefined);
  expect(b.angles).toEqual([90, 90, 90]);
  expect(b.results).toEqual(["合格", "合格", "合格"]);
});

describe("RebarWeldingTensileCard 渲染", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "RebarWeldingTensileCard 渲染 3 行 + 共享规格 Φ22", () => {
    const { container } = render(<RebarWeldingTensileCard {...makeProps()} />);
    expect(container.textContent).toContain("Φ22");
    expect(
      container.querySelectorAll('input[aria-label^="试件"][aria-label$="最大荷重"]').length,
    ).toBe(3);
  });

  fnTest(["M03.F03.I02"], "RebarWeldingTensileCard 录入最大荷重 → 抗拉强度自动算出（只读）", () => {
    const { container } = render(<RebarWeldingTensileCard {...makeProps()} />);
    const inputs = container.querySelectorAll<HTMLInputElement>(
      'input[aria-label^="试件"][aria-label$="最大荷重"]',
    );
    act(() => {
      fireEvent.change(inputs[0]!, { target: { value: "100" } });
    });
    // 100 kN → Rm = 4000·100/(π·22²) ≈ 263.16 → 圆整 0.1 → "263.2"
    expect(container.textContent).toContain("263.1");
  });

  fnTest(["M03.F03.I01"], "RebarWeldingTensileCard readOnly：输入禁用", () => {
    const { container } = render(<RebarWeldingTensileCard {...makeProps({ readOnly: true })} />);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="试件 1 最大荷重"]',
    );
    expect(input?.readOnly).toBe(true);
  });
});

describe("RebarWeldingBendCard 渲染", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "RebarWeldingBendCard 渲染 3 行弯曲角度 + 整体评定", () => {
    const { container } = render(<RebarWeldingBendCard {...makeProps()} />);
    expect(
      container.querySelectorAll('input[aria-label^="试件"][aria-label$="弯曲角度"]').length,
    ).toBe(3);
    expect(screen.getByText(/JGJ\/T 27-2014/)).toBeInTheDocument();
  });

  fnTest(["M03.F03.I02"], "RebarWeldingBendCard 整体评定：3 件全合格 → 合格", () => {
    const { container } = render(<RebarWeldingBendCard {...makeProps()} />);
    // 整体评定显示「合格」文字 + 3 个 select option 含「合格」；用正则限定 container 顶层 span
    expect(container.querySelector(".text-green-600")?.textContent).toBe("合格");
  });
});