// 钢筋力学性能数值卡（rebar-mech-numeric）dom + 算法测试。
// 通用多组数值卡：formulaKey 决定行为（tensile/yield/passthrough/ratio_*）。

import { describe, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { fnTest } from "../../fn";
import {
  computeStrengths,
  ratioTensileOverYield,
  ratioMeasuredOverSpec,
  meanOf,
  rounderFor,
} from "@/features/data-entry/models/rebar-mechanics";
import { RebarMechNumericCard } from "@/features/data-entry/models/RebarMechNumericCard";
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
    config: { formulaKey: "tensile_strength", specimenCount: 2, needsDiameter: true },
    onChange: vi.fn(),
    readOnly: false,
    ...over,
  };
}

fnTest(["M03.F03.I01"], "rebar-mechanics：tensile_strength 算子（R = 4000·F/(π·d²)）", () => {
  // d=22, F=[100,110] → [263.2, 289.5] MPa
  const s = computeStrengths([100, 110], 22);
  expect(s[0]).toBeCloseTo(263.2, 0);
  expect(s[1]).toBeCloseTo(289.5, 0);
});

fnTest(["M03.F03.I01"], "rebar-mechanics：强屈比 ratioTensileOverYield", () => {
  const t = [540, 560]; // 抗拉
  const y = [400, 420]; // 屈服
  const r = ratioTensileOverYield(t, y, 2);
  expect(r[0]).toBeCloseTo(1.35, 1);
  expect(r[1]).toBeCloseTo(1.33, 1);
});

fnTest(["M03.F03.I01"], "rebar-mechanics：超强比 ratioMeasuredOverSpec", () => {
  // 实测屈服 [440, 450]，标准屈服 400 → [1.10, 1.13]
  const r = ratioMeasuredOverSpec([440, 450], 400, 2);
  expect(r[0]).toBeCloseTo(1.1, 1);
  expect(r[1]).toBeCloseTo(1.13, 1);
});

fnTest(["M03.F03.I01"], "rebar-mechanics：meanOf 算术平均", () => {
  const round = rounderFor("tensile_strength");
  expect(meanOf([50, 60, 70], round)).toBe(60);
  expect(meanOf([0, 0, 0], round)).toBeUndefined();
});

describe("RebarMechNumericCard 渲染（tensile_strength）", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "RebarMechNumericCard tensile_strength：2 组 + 公称直径输入", () => {
    const { container } = render(<RebarMechNumericCard {...makeProps()} />);
    expect(
      container.querySelectorAll('input[aria-label^="第"][aria-label$="组 数值"]').length,
    ).toBe(2);
    expect(container.querySelector('input[aria-label="公称直径"]')).toBeTruthy();
  });

  fnTest(["M03.F03.I02"], "RebarMechNumericCard 录入最大力 + 直径 → 强度 + 均值上屏", () => {
    const { container } = render(<RebarMechNumericCard {...makeProps()} />);
    const dia = container.querySelector<HTMLInputElement>('input[aria-label="公称直径"]')!;
    const inputs = container.querySelectorAll<HTMLInputElement>(
      'input[aria-label^="第"][aria-label$="组 数值"]',
    );
    act(() => {
      fireEvent.change(dia, { target: { value: "22" } });
      fireEvent.change(inputs[0]!, { target: { value: "100" } });
    });
    expect(container.textContent).toContain("263.1");
  });

  fnTest(["M03.F03.I01"], "RebarMechNumericCard readOnly：禁用输入", () => {
    const { container } = render(<RebarMechNumericCard {...makeProps({ readOnly: true })} />);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="公称直径"]')!;
    expect(input.readOnly).toBe(true);
  });
});