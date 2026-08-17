// App — react-router 路由入口（Sprint 2 Batch 0）。
//
// 结构：
//   /login, /select-tenant     公共页（不带 AppShell）
//   /                          AppShell（layout route，守卫在 AppShell 内层）+ 22 条业务子路由
//   *                          兜底 404
//
// Sprint 2 镜像策略：业务页逐批落地（Batch 1 码表 4 页 → Batch 2 流程线 →
// Batch 3 检测能力 → Batch 4 数据录入/报告/汇总）。未落地批次先挂
// EmptyState 占位（route 已占坑，侧栏点进去不 404）。

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/app/app-shell";
import { LoginPage } from "@/pages/LoginPage";
import { SelectTenantPage } from "@/pages/SelectTenantPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmptyState } from "@/components/app/empty-state";
import { Suspense, lazy } from "react";

// -- Batch 1：基础数据码表 4 页（真页面）---------------------------------------
const ModelsPage = lazy(() => import("@/pages/ModelsPage"));
const SpecificationsPage = lazy(() => import("@/pages/SpecificationsPage"));
const GradesPage = lazy(() => import("@/pages/GradesPage"));
const BrandsPage = lazy(() => import("@/pages/BrandsPage"));

// -- 业务页（Sprint 2 逐批替换为真页面 lazy import）---------------------------

// -- Batch 2A：合同 / 报告名称 / 参数界面（码表式页）-------------------------
const ContractsPage = lazy(() => import("@/pages/ContractsPage"));
const ReportNamesPage = lazy(() => import("@/pages/ReportNamesPage"));
const ParamInterfacesPage = lazy(() => import("@/pages/ParamInterfacesPage"));

// -- Batch 2B：流程线 3 页（真页面）-------------------------------------------
const ReceiptsPage = lazy(() => import("@/pages/ReceiptsPage"));
const ReceiptDetailPage = lazy(() => import("@/pages/ReceiptDetailPage"));
const TaskAssignmentPage = lazy(() => import("@/pages/TaskAssignmentPage"));
const DataEntryPage = lazy(() => import("@/pages/DataEntryPage"));
const InspectionObjectsPage = placeholder("检测专项");
const InspectionStandardsPage = placeholder("检测标准");
const InspectionParametersPage = placeholder("检测参数");
const InspectionSpecialtiesPage = placeholder("检测项目");
const InspectionTechnicalRequirementsPage = placeholder("技术要求");
const InspectionCalculationRulesPage = placeholder("计算规则");
// -- Batch 2B-3：报告 4 阶段（review/approval/issuance/archived）-------------------------
const ReportIssuePage = lazy(() => import("@/pages/ReportIssuePage"));
const ReportReviewPage = lazy(() => import("@/pages/ReportReviewPage"));
const ReportApprovePage = lazy(() => import("@/pages/ReportApprovePage"));
const ReportArchivePage = lazy(() => import("@/pages/ReportArchivePage"));
const SummaryPage = placeholder("报告汇总");

function placeholder(title: string) {
  return function PlaceholderPage() {
    return (
      <EmptyState
        title={`${title}（Sprint 2 待镜像）`}
        description="本路由已占坑；页面随 Sprint 2 batch 逐批落地"
      />
    );
  };
}

function RouteSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-tenant" element={<SelectTenantPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          {/* 基础数据（Batch 1：models/specifications/grades/brands） */}
          <Route
            path="models"
            element={<RouteSuspense><ModelsPage /></RouteSuspense>}
          />
          <Route
            path="specifications"
            element={<RouteSuspense><SpecificationsPage /></RouteSuspense>}
          />
          <Route path="grades" element={<RouteSuspense><GradesPage /></RouteSuspense>} />
          <Route path="brands" element={<RouteSuspense><BrandsPage /></RouteSuspense>} />
          {/* 基础数据（Batch 2/3：contracts / report-names / param-interfaces） */}
          <Route
            path="contracts"
            element={<RouteSuspense><ContractsPage /></RouteSuspense>}
          />
          <Route
            path="report-names"
            element={<RouteSuspense><ReportNamesPage /></RouteSuspense>}
          />
          <Route
            path="param-interfaces"
            element={<RouteSuspense><ParamInterfacesPage /></RouteSuspense>}
          />
          {/* 试验过程（Batch 2） */}
          <Route path="receipts" element={<RouteSuspense><ReceiptsPage /></RouteSuspense>} />
          <Route
            path="receipts/:id"
            element={<RouteSuspense><ReceiptDetailPage /></RouteSuspense>}
          />
          <Route
            path="task-assignment"
            element={<RouteSuspense><TaskAssignmentPage /></RouteSuspense>}
          />
          <Route
            path="data-entry"
            element={<RouteSuspense><DataEntryPage /></RouteSuspense>}
          />
          {/* 检测能力（Batch 3） */}
          <Route
            path="inspection-objects"
            element={<RouteSuspense><InspectionObjectsPage /></RouteSuspense>}
          />
          <Route
            path="inspection-standards"
            element={<RouteSuspense><InspectionStandardsPage /></RouteSuspense>}
          />
          <Route
            path="inspection-parameters"
            element={<RouteSuspense><InspectionParametersPage /></RouteSuspense>}
          />
          <Route
            path="inspection-specialties"
            element={<RouteSuspense><InspectionSpecialtiesPage /></RouteSuspense>}
          />
          <Route
            path="inspection-technical-requirements"
            element={
              <RouteSuspense>
                <InspectionTechnicalRequirementsPage />
              </RouteSuspense>
            }
          />
          <Route
            path="inspection-calculation-rules"
            element={
              <RouteSuspense>
                <InspectionCalculationRulesPage />
              </RouteSuspense>
            }
          />
          {/* 报告 + 统计（Batch 4） */}
          <Route
            path="report-issue"
            element={<RouteSuspense><ReportIssuePage /></RouteSuspense>}
          />
          <Route
            path="report-review"
            element={<RouteSuspense><ReportReviewPage /></RouteSuspense>}
          />
          <Route
            path="report-approve"
            element={<RouteSuspense><ReportApprovePage /></RouteSuspense>}
          />
          <Route
            path="report-archive"
            element={<RouteSuspense><ReportArchivePage /></RouteSuspense>}
          />
          <Route path="summary" element={<RouteSuspense><SummaryPage /></RouteSuspense>} />
        </Route>
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center">
              <EmptyState title="404" description="页面不存在" />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
