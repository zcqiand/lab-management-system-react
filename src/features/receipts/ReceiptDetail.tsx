// M03.F09 接样单详情 — 流程线任一环节可查看的详情页（路由 /receipts/:id）。
//
// UI 模式（对齐 REF nextjs ReceiptDetailPage）：
//   - 接样信息表（委托书 / 工程 / 取样 / 检测类别 / 流程状态 / 报告参数等）
//   - 流程历史时间线（M03.F09.I02，列出 flowHistory 全部条目）
//   - 「报告预览」按钮（M03.F09.I03）→ 弹窗（占位 Batch 2B-2 data-entry 镜像完整 ReportPreviewModal）
//   - 「关闭」按钮 → history.back()
//
// react 仓镜像要点：
//   - 用 react-router-dom 的 useParams 取 id（nextjs 是 next/navigation）
//   - 详情字段优先从 /api/receipts/:id 单条取（seed 给 id 字段）
//   - 时间线按 FLOW_STAGE_LABELS 标签 + at 时间倒序展示

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import type { SampleReceipt } from "@/types/process/sample-receipt";
import { FLOW_STAGE_LABELS } from "@/types/process/flow";
import { ReportPreviewModal } from "@/features/data-entry/ReportPreviewModal";

export function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<SampleReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiClient.get<SampleReceipt>(
          `${API_ROUTES["/receipts"]}/${id}`,
        );
        setReceipt(res.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">加载中…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!receipt) return null;

  const history = [...(receipt.flowHistory ?? [])].sort((a, b) =>
    b.at.localeCompare(a.at),
  );

  return (
    <div className="space-y-4">
      {/* @entry M03.F09.I01 接样单详情页 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">接样单详情 — {receipt.commissionCode}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              data-fn="M03.F09.I03"
            >
              报告预览
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              返回
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div><span className="text-slate-500">委托书编号：</span>{receipt.commissionCode}</div>
            <div><span className="text-slate-500">委托日期：</span>{receipt.commissionDate}</div>
            <div><span className="text-slate-500">工程名称：</span>{receipt.projectName ?? "—"}</div>
            <div><span className="text-slate-500">委托单位：</span>{receipt.clientUnit ?? "—"}</div>
            <div><span className="text-slate-500">建设单位：</span>{receipt.buildingUnit ?? "—"}</div>
            <div><span className="text-slate-500">监理单位：</span>{receipt.supervisorUnit ?? "—"}</div>
            <div><span className="text-slate-500">施工单位：</span>{receipt.constructionUnit ?? "—"}</div>
            <div><span className="text-slate-500">见证单位：</span>{receipt.witnessUnit ?? "—"}</div>
            <div><span className="text-slate-500">见证人：</span>{receipt.witness ?? "—"}</div>
            <div><span className="text-slate-500">送检人：</span>{receipt.inspector ?? "—"}</div>
            <div><span className="text-slate-500">取样地点：</span>{receipt.samplingLocation ?? "—"}</div>
            <div><span className="text-slate-500">接样人：</span>{receipt.receivedBy}</div>
            <div><span className="text-slate-500">报告类别：</span>{receipt.categoryCode}</div>
            <div><span className="text-slate-500">检测类别：</span>{receipt.testCategory}</div>
            <div><span className="text-slate-500">样品来源：</span>{receipt.sampleSource}</div>
            <div><span className="text-slate-500">合同 ID：</span>{receipt.contractId}</div>
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
            {receipt.assigneeName && (
              <div><span className="text-slate-500">检测负责人：</span>{receipt.assigneeName}</div>
            )}
            {receipt.plannedTestDate && (
              <div><span className="text-slate-500">计划检测日期：</span>{receipt.plannedTestDate}</div>
            )}
            {receipt.reportCode && (
              <div><span className="text-slate-500">报告编号：</span>{receipt.reportCode}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* @entry M03.F09.I02 流程历史时间线（按 at 倒序） */}
      <Card data-fn="M03.F09.I02">
        <CardHeader>
          <CardTitle className="text-base">流程历史</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="py-4 text-center text-sm text-slate-400">
              （暂无流程操作记录）
            </div>
          ) : (
            <ol className="space-y-2">
              {history.map((h, i) => {
                const actionLabel =
                  h.action === "submit"
                    ? "提交"
                    : h.action === "return"
                      ? "退回"
                      : "撤回";
                return (
                  <li key={i} className="flex items-center gap-3 border-l-2 border-slate-200 pl-3">
                    <span className="text-xs text-slate-400">{h.at}</span>
                    <span className="font-medium">{actionLabel}</span>
                    <span className="text-sm text-slate-600">
                      {FLOW_STAGE_LABELS[h.from]} → {FLOW_STAGE_LABELS[h.to]}
                    </span>
                    <span className="text-xs text-slate-500">操作人：{h.operator}</span>
                    {h.reason && (
                      <span className="text-xs text-slate-500">备注：{h.reason}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <ReportPreviewModal
        open={previewOpen}
        receipt={receipt}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}