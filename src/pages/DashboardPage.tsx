// DashboardPage — Sprint 1 仪表盘空壳（sprint-roadmap：内容 Sprint 2 加）。

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { LayoutDashboard } from "lucide-react";

export function DashboardPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="仪表盘" description="检测业务总览" actions={null} />
      <EmptyState
        icon={<LayoutDashboard />}
        title="仪表盘建设中"
        description="Sprint 2 将填充合同/接样/样品/报告统计与待办任务"
      />
    </div>
  );
}
