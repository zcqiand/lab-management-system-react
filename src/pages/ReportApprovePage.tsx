// M03.F06 报告批准 — page 包装
import { ReportPhasePage } from "@/features/reports/ReportPhasePage";

export default function ReportApprovePage() {
  // @entry M03.F06.I01 批准队列
  return (
    <ReportPhasePage
      title="报告批准"
      subtitle="批准后进入报告发放（flowStatus=approval）"
      stage="approval"
      submitLabel="批准"
      i01DataFn="M03.F06.I01"
      i02DataFn="M03.F06.I02"
    />
  );
}