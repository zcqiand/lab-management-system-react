// 内容区加载态（B6 批）—— 页面数据未到齐前整页 PageLoading，不渲染空壳。
//
// 工程设施测试：不挂 fn ID（fn.ts 纪律：工程设施测试不挂业务 ID）。
// 网络全部 mock（vi.mock orval 端点模块 + deferred promise），不连真后端：
//   - pending：断言 data-testid="page-loading" 在场、页面真实内容（表头/标题）不可见
//   - resolve：内容可见、加载态消失
//   - SummaryList 聚合：两个数据源任一未到仍整页加载，全部到齐才显示
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { Contract } from "@/api/endpoints/model/contract";

const contractApi = vi.hoisted(() => ({
  contractsListContracts: vi.fn(),
}));
const summaryApi = vi.hoisted(() => ({
  summaryGetReportSummary: vi.fn(),
  summaryGetDashboardStats: vi.fn(),
}));

vi.mock("@/api/endpoints/contracts/contracts", () => ({
  contractsListContracts: contractApi.contractsListContracts,
  contractsCreateContract: vi.fn(),
  contractsDeleteContract: vi.fn(),
  contractsUpdateContract: vi.fn(),
}));
vi.mock("@/api/endpoints/summary/summary", () => ({
  summaryGetReportSummary: summaryApi.summaryGetReportSummary,
  summaryGetDashboardStats: summaryApi.summaryGetDashboardStats,
}));

import { ContractsList } from "@/features/contracts/ContractsList";
import { SummaryList } from "@/features/summary/SummaryList";
import { PageLoading } from "@/components/app/page-loading";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const contractList = deferred<never>();
const summaryData = deferred<never>();
const dashboardStats = deferred<never>();

const SEED_CONTRACT = {
  id: "t1",
  contractCode: "CONTRACT-T1",
  clientUnit: "委托单位T",
  projectName: "工程T",
  constructionUnit: "施工T",
  witnessUnit: "见证T",
  witness: "张三",
  status: "active",
} as unknown as Contract;

beforeEach(() => {
  vi.clearAllMocks();
  contractApi.contractsListContracts.mockReturnValue(contractList.promise);
  summaryApi.summaryGetReportSummary.mockReturnValue(summaryData.promise);
  summaryApi.summaryGetDashboardStats.mockReturnValue(dashboardStats.promise);
});

describe("页面级加载态（PageLoading 门控）", () => {
  it("PageLoading 组件渲染加载标记（testid + 文案）", () => {
    render(<PageLoading />);
    expect(screen.getByTestId("page-loading")).toBeTruthy();
    expect(screen.getByText("加载中…")).toBeTruthy();
  });

  it("ContractsList：fetch pending 时整页加载态，空表壳不先渲染；resolve 后内容可见", async () => {
    render(<ContractsList />);

    // RED（改前）：壳（标题/表头/空表）先渲染，且没有整页加载标记
    expect(screen.getByTestId("page-loading")).toBeTruthy();
    expect(screen.queryByText("合同编号")).toBeNull();
    expect(screen.queryByText("合同列表")).toBeNull();

    await act(async () => {
      contractList.resolve({
        data: { items: [SEED_CONTRACT], total: 1 },
      } as never);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("page-loading")).toBeNull();
    });
    expect(screen.getByText("CONTRACT-T1")).toBeTruthy();
    expect(screen.getByText("合同编号")).toBeTruthy();
  });

  it("SummaryList：两个数据源任一未到即整页加载态，全部到齐才显示界面", async () => {
    render(<SummaryList />);

    expect(screen.getByTestId("page-loading")).toBeTruthy();
    expect(screen.queryByText("报告汇总")).toBeNull();

    // 只到 stats（1/2 源）——仍整页加载
    await act(async () => {
      dashboardStats.resolve({
        data: { contractCount: 1, reportCountByStatus: {} },
      } as never);
    });
    expect(screen.getByTestId("page-loading")).toBeTruthy();

    // 汇总表也到（2/2 源）——加载态消失，内容可见
    await act(async () => {
      summaryData.resolve({
        data: {
          summaryName: "汇总",
          columns: [{ key: "commissionCode", label: "委托书编号" }],
          rows: [{ commissionCode: "RC-001" }],
        },
      } as never);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("page-loading")).toBeNull();
    });
    expect(screen.getByText("报告汇总")).toBeTruthy();
    expect(screen.getByText("RC-001")).toBeTruthy();
  });
});
