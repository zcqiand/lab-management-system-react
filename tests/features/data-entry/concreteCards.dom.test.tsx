// 混凝土类模型卡（concrete-compress / concrete-permeability）dom 测试。
// Batch 2B-7 后落地，镜像 nextjs 的对应测试。

import { describe, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { fnTest } from "../../fn";
import { ConcreteCompressCard } from "@/features/data-entry/models/ConcreteCompressCard";
import { ConcretePermeabilityCard } from "@/features/data-entry/models/ConcretePermeabilityCard";
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
    parameter: param("IP-0055", "立方体抗压强度"),
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

describe("ConcreteCompressCard", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "ConcreteCompressCard 渲染 3 个破坏荷载输入框（specimenCount=3）", () => {
    const { container } = render(<ConcreteCompressCard {...makeProps()} />);
    expect(
      container.querySelectorAll('input[type="number"][placeholder="破坏荷载 (kN)"]').length,
    ).toBe(3);
  });

  fnTest(["M03.F03.I02"], "ConcreteCompressCard 录入荷载 → onChange 上报代表值 JSON", () => {
    const onChange = vi.fn();
    const { container } = render(<ConcreteCompressCard {...makeProps({ onChange })} />);
    const inputs = container.querySelectorAll<HTMLInputElement>(
      'input[type="number"][placeholder="破坏荷载 (kN)"]',
    );
    fireEvent.change(inputs[0]!, { target: { value: "450" } });
    fireEvent.change(inputs[1]!, { target: { value: "450" } });
    fireEvent.change(inputs[2]!, { target: { value: "450" } });
    const last = onChange.mock.calls.at(-1)![0];
    const parsed = JSON.parse(last.result);
    expect(parsed.loads).toEqual([450, 450, 450]);
    expect(parsed.representative).toBeCloseTo(20, 0); // 450000/22500 = 20 MPa
  });

  fnTest(["M03.F03.I01"], "ConcreteCompressCard readOnly：输入吞掉 onChange", () => {
    const onChange = vi.fn();
    const { container } = render(<ConcreteCompressCard {...makeProps({ readOnly: true, onChange })} />);
    const input = container.querySelector<HTMLInputElement>(
      'input[type="number"][placeholder="破坏荷载 (kN)"]',
    )!;
    fireEvent.change(input, { target: { value: "500" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ConcretePermeabilityCard", () => {
  beforeEach(() => cleanup());

  fnTest(["M03.F03.I01"], "ConcretePermeabilityCard 渲染 6 个试件行（specimenCount=6）", () => {
    const { container } = render(
      <ConcretePermeabilityCard {...makeProps({ parameter: param("IP-0190", "抗渗性能") })} />,
    );
    expect(
      container.querySelectorAll('input[aria-label^="试件"][aria-label$="渗水压力"]').length,
    ).toBe(6);
  });

  fnTest(["M03.F03.I02"], "ConcretePermeabilityCard 6 件全未渗 → 抗渗等级显示「—」", () => {
    render(
      <ConcretePermeabilityCard {...makeProps({ parameter: param("IP-0190", "抗渗性能") })} />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  fnTest(["M03.F03.I01"], "ConcretePermeabilityCard readOnly：禁用输入", () => {
    const { container } = render(
      <ConcretePermeabilityCard {...makeProps({ parameter: param("IP-0190", "抗渗性能"), readOnly: true })} />,
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="试件 1 渗水压力"]',
    );
    expect(input?.readOnly).toBe(true);
  });
});