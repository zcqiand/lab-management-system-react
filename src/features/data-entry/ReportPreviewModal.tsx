// M03.F09.I03 报告预览弹窗（升级版，Batch 2B-2 替代 Batch 2B-1 占位）。
//
// 镜像 nextjs REF src/features/data-entry/ReportPreviewModal.tsx 简化版：
// - 显示接样单字段表 + 当前类别 + 检测参数列表（react 仓无 docx 模板/渲染，跳过 docx 解析）
// - 全前端链路：模板按 categoryCode 查 /templates/<code>.docx（react 仓无静态资源，所以仅展示字段表）
// - 反馈：sonner toast.success/error；close 走 onClose
//
// react 仓镜像要点：
//   - 与 Batch 2B-1 ReceiptDetail 用的占位弹窗同名同 props 接口（open/receipt/onClose）—
//     升级时不影响 ReceiptDetail 引用
//   - data-fn="M03.F09.I03" 已在 ReceiptDetail 的「报告预览」按钮上挂（M03.F09.I03 锚点不变）

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SampleReceipt } from "@/types/process/sample-receipt";
import { FLOW_STAGE_LABELS } from "@/types/process/flow";

interface Props {
  open: boolean;
  receipt: SampleReceipt;
  onClose: () => void;
}

export function ReportPreviewModal({ open, receipt, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>报告预览 — {receipt.commissionCode}</DialogTitle>
          <DialogDescription>
            M03.F09.I03 报告预览（Batch 2B-2 升级版：字段表 + 类别参数列表 + 状态）
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="text-slate-500">委托书编号：</span>
              {receipt.commissionCode}
            </div>
            <div>
              <span className="text-slate-500">委托日期：</span>
              {receipt.commissionDate}
            </div>
            <div>
              <span className="text-slate-500">工程名称：</span>
              {receipt.projectName ?? "—"}
            </div>
            <div>
              <span className="text-slate-500">委托单位：</span>
              {receipt.clientUnit ?? "—"}
            </div>
            <div>
              <span className="text-slate-500">报告类别：</span>
              {receipt.categoryCode}
            </div>
            <div>
              <span className="text-slate-500">检测类别：</span>
              {receipt.testCategory}
            </div>
            <div>
              <span className="text-slate-500">流程状态：</span>
              {FLOW_STAGE_LABELS[receipt.flowStatus] ?? receipt.flowStatus}
            </div>
            <div>
              <span className="text-slate-500">检测结果：</span>
              {receipt.result === "pass"
                ? "合格"
                : receipt.result === "fail"
                  ? "不合格"
                  : "—"}
            </div>
          </div>
          <div>
            <span className="text-slate-500">检测参数：</span>
            {receipt.testParameters && receipt.testParameters.length > 0
              ? receipt.testParameters.join("、")
              : "—"}
          </div>
          <div className="border-t pt-2 text-xs text-slate-500">
            说明：react 仓当前不含 docx 模板渲染（无 /templates 静态资源），完整 ReportPreviewModal
            渲染待 Batch 2B-N（shared 算法域 + 模板 JSON 下沉）一并补齐。
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReportPreviewModal;