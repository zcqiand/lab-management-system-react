// M03.F05/F06/F07/F08 报告审核/批准/发放/归档 4 阶段页 — 流程线第四至第七环节。
//
// 镜像 nextjs REF src/features/reports/{ReportReview,ReportApprove,ReportIssue,ReportArchive}Page.tsx 模式：
// - 共享 ReportPhasePage（参数：stage + submitLabel + i01/i02 I-level data-fn）
// - 4 个 page wrapper 各传一组 stage/submitLabel/data-fn
// - 顶部筛选 + 列表（按 flowStatus={stage} 过滤接样单）
// - 选中行后「{submitLabel}」/「退回」按钮调 /api/receipts/flow 推进状态机
//
// react 仓镜像要点：
//   - 复用 Batch 2B-1 ReceiptsList 模式（list + Dialog 自实现 + ConfirmModal）
//   - data-fn 静态字面量字符串
//   - 「退回」= action=return，批次回退一阶；submit={submitLabel}= action=submit
//   - 报告发放阶段（F07）额外在提交后生成报告编号（msw handler 已自动生成，此处只显示）

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import type { SampleReceipt } from "@/types/process/sample-receipt";
import { FLOW_STAGE_LABELS } from "@/types/process/flow";

type PhaseStage = "review" | "approval" | "issuance" | "archived";

interface Props {
  title: string;
  subtitle: string;
  stage: PhaseStage;
  submitLabel: string;
  /** M03.F0x.I01 页锚点（@entry 注释 + 表格 data-fn） */
  i01DataFn: string;
  /** M03.F0x.I02 提交按钮 data-fn（无 I-level 不传） */
  i02DataFn?: string;
}

export function ReportPhasePage({
  title,
  subtitle,
  stage,
  submitLabel,
  i01DataFn,
  i02DataFn,
}: Props) {
  const [rows, setRows] = useState<SampleReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [returnTarget, setReturnTarget] = useState<SampleReceipt | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const mounted = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: "1",
        pageSize: "50",
        flowStatus: stage,
      };
      if (keyword) params["keyword"] = keyword;
      const res = await apiClient.get<{ items: SampleReceipt[]; total: number }>(
        API_ROUTES["/receipts"],
        { params },
      );
      setRows(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(typeof res.data?.total === "number" ? res.data.total : 0);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function batchSubmit() {
    if (selected.size === 0) {
      toast.error("请先选择接样单");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post<{
        results: Array<{ id: string; ok: boolean; message?: string }>;
      }>(API_ROUTES["/receipts/flow"], {
        ids: Array.from(selected),
        action: "submit",
        operator: "current-user",
      });
      const failed = (res.data?.results ?? []).filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`${submitLabel}完成（${selected.size} 单）`);
      } else {
        toast.error(`${failed.length} 单处理失败：${failed[0]?.message ?? ""}`);
      }
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn() {
    if (!returnTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(API_ROUTES["/receipts/flow"], {
        ids: [returnTarget.id],
        action: "return",
        operator: "current-user",
        reason: returnReason.trim() || undefined,
      });
      toast.success("已退回");
      setReturnTarget(null);
      setReturnReason("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          className="max-w-sm"
          placeholder="按委托书编号搜索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <Button variant="outline" onClick={() => void load()}>
          搜索
        </Button>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={submitting || selected.size === 0}
            onClick={() => void batchSubmit()}
            data-fn={i02DataFn}
          >
            {submitLabel}（{selected.size}）
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{title}（{total || "…"}）</CardTitle>
          {loading && <span className="text-xs text-slate-400">加载中…</span>}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="全选"
                  />
                </th>
                <th className="px-4 py-2 text-left">委托书编号</th>
                <th className="px-4 py-2 text-left">工程名称</th>
                <th className="px-4 py-2 text-left">检测结果</th>
                <th className="px-4 py-2 text-left">流程状态</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    （无数据）
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} data-fn={i01DataFn} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`选择 ${r.commissionCode}`}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link
                      to={`/receipts/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.commissionCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.projectName ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.result === "pass"
                      ? "合格"
                      : r.result === "fail"
                        ? "不合格"
                        : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        setReturnTarget(r);
                        setReturnReason("");
                      }}
                    >
                      退回
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog
        open={returnTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReturnTarget(null);
            setReturnReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>退回 — {returnTarget?.commissionCode ?? ""}</DialogTitle>
            <DialogDescription>
              退回后该接样单回到上一环节（{returnTarget
                ? FLOW_STAGE_LABELS[
                    ({ review: "data_entry", approval: "review", issuance: "approval", archived: "issuance" } as const)[returnTarget.flowStatus as PhaseStage] ?? "上一环节"
                  ]
                : ""}）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs block">退回原因（可选）</label>
            <Input
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="如：数据待补正"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleReturn()}
              disabled={submitting}
            >
              确认退回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}