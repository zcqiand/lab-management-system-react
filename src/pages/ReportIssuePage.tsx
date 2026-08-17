// M03.F07 报告发放 — page 包装
import { ReportPhasePage } from "@/features/reports/ReportPhasePage";

export default function ReportIssuePage() {
  // @entry M03.F07.I01 发放队列
  return (
    <ReportPhasePage
      title="报告发放"
      subtitle="发放后进入归档（flowStatus=issuance，提交时自动生成报告编号）"
      stage="issuance"
      submitLabel="发放"
      i01DataFn="M03.F07.I01"
      i02DataFn="M03.F07.I02"
    />
  );
}