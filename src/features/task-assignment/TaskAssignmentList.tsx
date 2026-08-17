// M03.F02 任务分配 — 流程线第二环节（flowStatus='task_assignment'）。
//
// UI 模式（对齐 REF nextjs TaskAssignmentPage）：
//   - 顶部：标题 + 说明 + 「批量提交到数据录入」按钮
//   - 筛选条：关键字 + 状态过滤
//   - 表格：委托书编号 / 工程名称 / 检测人员（assigneeName）/ 计划检测日期 / 流程状态 / 操作
//   - 「安排」按钮（M03.F02.I02）→ 弹窗录入 assigneeName + plannedTestDate 后 PUT /receipts/:id
//   - 「详情」链接到 /receipts/:id
//
// react 仓镜像要点：
//   - apiClient + API_ROUTES 与 nextjs 一致
//   - 列表按 flowStatus='task_assignment' 过滤（按 REF 语义）
//   - 任务信息直接落在 SampleReceipt（assigneeId/assigneeName/plannedTestDate），无独立任务表
//   - data-fn 静态字面量字符串（M03.F02.I01/I02），L5 静态解析能吃到

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function TaskAssignmentList() {
  const [items, setItems] = useState<SampleReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SampleReceipt | null>(null);
  const [assigneeName, setAssigneeName] = useState("");
  const [plannedTestDate, setPlannedTestDate] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: "1",
        pageSize: "50",
        flowStatus: "task_assignment",
      };
      if (keyword) params["keyword"] = keyword;
      const res = await apiClient.get<{ items: SampleReceipt[]; total: number }>(
        API_ROUTES["/receipts"],
        { params },
      );
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(typeof res.data?.total === "number" ? res.data.total : 0);
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

  const openAssign = (r: SampleReceipt) => {
    setAssignTarget(r);
    setAssigneeName(r.assigneeName ?? "");
    setPlannedTestDate(r.plannedTestDate ?? new Date().toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    if (!assignTarget) return;
    setSaving(true);
    try {
      await apiClient.put(`${API_ROUTES["/receipts"]}/${assignTarget.id}`, {
        assigneeName: assigneeName.trim(),
        assigneeId: assigneeName.trim() ? `u-${assigneeName.trim()}` : undefined,
        plannedTestDate,
      });
      toast.success("任务已安排");
      setAssignTarget(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* @entry M03.F02.I01 任务分配队列页 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">任务分配</h1>
          <p className="text-sm text-slate-500">
            M03.F02 为接样单指定检测人员与计划日期（flowStatus=task_assignment）
          </p>
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            待安排接样单（{total || "…"}）
          </CardTitle>
          {loading && <span className="text-xs text-slate-400">加载中…</span>}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">委托书编号</th>
                <th className="px-4 py-2 text-left">工程名称</th>
                <th className="px-4 py-2 text-left">检测人员</th>
                <th className="px-4 py-2 text-left">计划日期</th>
                <th className="px-4 py-2 text-left">流程状态</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    （无待安排接样单）
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
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
                    {r.assigneeName ?? (
                      <span className="text-slate-400">待安排</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{r.plannedTestDate ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssign(r)}
                      data-fn="M03.F02.I02"
                    >
                      安排
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog
        open={assignTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>任务安排 — {assignTarget?.commissionCode ?? ""}</DialogTitle>
            <DialogDescription>指定检测人员与计划检测日期。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">检测人员 *</Label>
              <Input
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="如：张三"
              />
            </div>
            <div>
              <Label className="text-xs">计划检测日期 *</Label>
              <Input
                type="date"
                value={plannedTestDate}
                onChange={(e) => setPlannedTestDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !assigneeName.trim() || !plannedTestDate}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}