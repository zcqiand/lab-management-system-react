// M03.F05 报告审核 — page 包装
import { ReportPhasePage } from "@/features/reports/ReportPhasePage";

export default function ReportReviewPage() {
  // @entry M03.F05.I01 审核队列
  return (
    <ReportPhasePage
      title="报告审核"
      subtitle="审核通过后进入报告批准（flowStatus=review）"
      stage="review"
      submitLabel="审核通过"
      i01DataFn="M03.F05.I01"
      i02DataFn="M03.F05.I02"
    />
  );
}