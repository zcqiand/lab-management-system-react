// Sprint 2 Batch 2B-4：M06 检测能力 6 薄页 + 10 I DOM 测试。
//
// 适配层（installShapeAdapters in tests/helpers/seed.ts）已铺：
//   - 主表 wrapDict（id=code + keyword 过滤 + junction 反查）
//   - junction 反查（specialty→object→standard / parameter）
//   - 计算方法 GET（+ testingStandardCode 过滤）
//   - 技术要求 GET（+ judgmentStandardCode 过滤）
//
// 测试只断言：标题、列表渲染、关键按钮存在；不调 POST/PUT/DELETE。
import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { fnTest } from "../../fn";
import { server } from "../../setup.dom";
import { installShapeAdapters, resetFixtures } from "../../helpers/seed";
import { InspectionCapabilityList } from "@/features/inspection-capability/InspectionCapabilityList";
import { CalculationMethodList } from "@/features/inspection-capability/CalculationMethodList";
import { TechnicalRequirementList } from "@/features/inspection-capability/TechnicalRequirementList";

beforeEach(() => {
  cleanup();
  resetFixtures();
  installShapeAdapters(server);
});

afterEach(() => {
  cleanup();
});

describe("M06.F01 检测专项维护", () => {
  fnTest(["M06.F01.I01"], "F01 渲染标题 + 列表行（fixtures 真数据穿透）", async () => {
    render(<InspectionCapabilityList resource="specialties" />);
    expect(screen.getByText("检测专项维护")).toBeTruthy();
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  fnTest(["M06.F01.I01"], "F01 新建按钮存在 + 编码列显示官方序号", async () => {
    render(<InspectionCapabilityList resource="specialties" />);
    expect(screen.getByRole("button", { name: /新建检测专项/ })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("SP01")).toBeTruthy();
    });
  });
});

describe("M06.F02 检测项目维护", () => {
  fnTest(["M06.F02.I01"], "F02 渲染标题 + 检测专项筛选下拉", async () => {
    render(<InspectionCapabilityList resource="objects" />);
    expect(screen.getByText("检测项目维护")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByLabelText("检测专项筛选")).toBeTruthy();
    });
  });

  fnTest(
    ["M06.F02.I01", "M06.F02.I02"],
    "F02 新建按钮存在 + 行内编辑/删除按钮",
    async () => {
      render(<InspectionCapabilityList resource="objects" />);
      expect(screen.getByRole("button", { name: /新建检测项目/ })).toBeTruthy();
      await waitFor(() => {
        const editBtns = screen.getAllByRole("button", { name: /^编辑 / });
        expect(editBtns.length).toBeGreaterThan(0);
      });
    },
  );
});

describe("M06.F03 检测参数维护", () => {
  fnTest(["M06.F03.I01"], "F03 渲染标题 + 3 级筛选下拉（专项/项目/标准）", async () => {
    render(<InspectionCapabilityList resource="parameters" />);
    expect(screen.getByText("检测参数维护")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByLabelText("检测专项筛选")).toBeTruthy();
      expect(screen.getByLabelText("检测项目筛选")).toBeTruthy();
      expect(screen.getByLabelText("检测标准筛选")).toBeTruthy();
    });
  });
});

describe("M06.F04 检测标准维护", () => {
  fnTest(["M06.F04.I01"], "F04 渲染标题 + 列表行", async () => {
    render(<InspectionCapabilityList resource="standards" />);
    expect(screen.getByText("检测标准维护")).toBeTruthy();
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  fnTest(
    ["M06.F04.I01", "M06.F04.I02"],
    "F04 新建按钮存在 + 标准编码列显示",
    async () => {
      render(<InspectionCapabilityList resource="standards" />);
      expect(screen.getByRole("button", { name: /新建检测标准/ })).toBeTruthy();
      await waitFor(() => {
        // msw 种子有 GB 175-2023
        expect(screen.getByText("GB 175-2023")).toBeTruthy();
      });
    },
  );
});

describe("M06.F05 计算方法维护", () => {
  fnTest(["M06.F05.I01"], "F05 渲染标题 + 列表行（复合主键 fixtures）", async () => {
    render(<CalculationMethodList />);
    expect(screen.getByText("计算方法维护")).toBeTruthy();
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  fnTest(["M06.F05.I01"], "F05 新建按钮 + 行内编辑/删除按钮", async () => {
    render(<CalculationMethodList />);
    expect(screen.getByRole("button", { name: /新建计算方法/ })).toBeTruthy();
    await waitFor(() => {
      const delBtns = screen.getAllByRole("button", { name: /^删除 / });
      expect(delBtns.length).toBeGreaterThan(0);
    });
  });
});

describe("M06.F06 技术要求维护", () => {
  fnTest(["M06.F06.I01"], "F06 渲染标题 + 4 维筛选（牌号/型号/等级/规格）", async () => {
    render(<TechnicalRequirementList />);
    expect(screen.getByText("技术要求维护")).toBeTruthy();
    expect(screen.getByLabelText("牌号筛选")).toBeTruthy();
    expect(screen.getByLabelText("型号筛选")).toBeTruthy();
    expect(screen.getByLabelText("等级筛选")).toBeTruthy();
    expect(screen.getByLabelText("规格筛选")).toBeTruthy();
  });

  fnTest(
    ["M06.F06.I01", "M06.F06.I02", "M06.F06.I03"],
    "F06 列表渲染（fixtures 穿透）+ 新建按钮",
    async () => {
      render(<TechnicalRequirementList />);
      expect(screen.getByRole("button", { name: /新建技术要求/ })).toBeTruthy();
      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        expect(rows.length).toBeGreaterThan(1);
      });
    },
  );

  fnTest(["M06.F06.I01"], "F06 4 维筛选输入可达（fireEvent 模拟）", async () => {
    render(<TechnicalRequirementList />);
    const brand = screen.getByLabelText("牌号筛选") as HTMLInputElement;
    fireEvent.change(brand, { target: { value: "P·O 42.5" } });
    expect(brand.value).toBe("P·O 42.5");
  });
});
