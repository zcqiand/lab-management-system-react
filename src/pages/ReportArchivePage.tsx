// M03.F08 报告归档 — page 包装
import { ReportPhasePage } from "@/features/reports/ReportPhasePage";

export default function ReportArchivePage() {
  // @entry M03.F08.I01 归档队列
  // @entry M03.F08.I02 归档完成按钮（i02DataFn 透传 ReportPhasePage）
  return (
    <ReportPhasePage
      title="报告归档"
      subtitle="归档完成后进入已完成（flowStatus=archived）"
      stage="archived"
      submitLabel="归档完成"
      i01DataFn="M03.F08.I01"
      i02DataFn="M03.F08.I02"
    />
  );
}