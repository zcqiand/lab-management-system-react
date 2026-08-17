// 颗粒级配卡（particle-gradation）dom + 算法测试。
// GB/T 14684 砂：7 筛孔（4.75→0.15 + 筛底）；GB/T 14685 碎卵石：12 筛孔。

import { describe, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { fnTest } from "../../fn";
import { ParticleGradationCard } from "@/features/data-entry/models/ParticleGradationCard";
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
    parameter: param("IP-0577", "颗粒级配"),
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

describe("ParticleGradationCard 渲染（砂）", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "ParticleGradationCard 渲染 2 样品 × 7 筛孔 + 平均行", () => {
    const { container } = render(<ParticleGradationCard {...makeProps()} />);
    expect(container.textContent).toContain("4.75mm");
    expect(container.textContent).toContain("筛底");
    expect(container.textContent).toContain("平均值(%)");
  });

  fnTest(["M03.F03.I01"], "ParticleGradationCard gravel=true 切换到 12 筛孔", () => {
    const { container } = render(
      <ParticleGradationCard {...makeProps({ config: { gravel: true } })} />,
    );
    expect(container.textContent).toContain("90mm");
    expect(container.textContent).toContain("2.36mm");
  });

  fnTest(["M03.F03.I02"], "ParticleGradationCard 录入分计筛余 → onChange 上报累计筛余 JSON", () => {
    const onChange = vi.fn();
    const { container } = render(<ParticleGradationCard {...makeProps({ onChange })} />);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="第 1 行 4.75mm 分计筛余"]',
    )!;
    act(() => {
      fireEvent.change(input, { target: { value: "5" } });
      fireEvent.blur(input);
    });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    const parsed = JSON.parse(last.result);
    expect(parsed.rows[0].retainedPct[0]).toBe(5);
    expect(parsed.rows[0].cumulativePct[0]).toBe(5);
  });

  fnTest(["M03.F03.I01"], "ParticleGradationCard readOnly：禁用输入", () => {
    const { container } = render(<ParticleGradationCard {...makeProps({ readOnly: true })} />);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="第 1 行 4.75mm 分计筛余"]',
    )!;
    expect(input.readOnly).toBe(true);
  });
});