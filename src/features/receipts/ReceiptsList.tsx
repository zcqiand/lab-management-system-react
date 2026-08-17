// M03.F01 接样管理 — 流程线第一环节（flowStatus='receiving'）。
//
// UI 模式（对齐 REF nextjs ReceiptList）：
//   - 顶部 flowStatus 三态过滤（全部 / 接样中 / 已提交）+ 关键字
//   - 表格：委托书编号 / 工程名称 / 委托单位 / 检测类别 / 流程状态 / 创建时间 / 操作
//   - 「新建接样」按钮（M03.F01.I02）→ 弹窗创建（M03.F01.I02 复用最简字段）
//   - 「编辑」「删除」按钮（M03.F01.I03）
//   - 「提交」按钮推进状态机 receiving → task_assignment（M03.F01.I04）
//   - 「详情」链接到 /receipts/:id（M03.F09.I01 入口）
//
// react 仓镜像要点：
//   - apiClient + API_ROUTES 与 nextjs 一致（共享 contracts.ts 同款）
//   - toast 用 sonner（与 nextjs 一致）
//   - Dialog/Button/Input/Card 都从 @/components/ui 走（shadcn 风格）
//   - data-fn 用静态字面量字符串（M03.F01.I01/I02/I03/I04），L5 静态解析能吃到
//   - submit 流程走 /api/receipts/flow（installShapeAdapters 已含完整 8 阶流转语义）

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
import { ConfirmModal } from "@/components/ConfirmModal";

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; id: string };
type FlowFilter = "" | "receiving" | "submitted";

type ReceiptBody = {
  commissionCode: string;
  commissionDate: string;
  projectName: string;
  clientUnit: string;
  testCategory: string;
  sampleSource: string;
  categoryCode: string;
};

const EMPTY_BODY: ReceiptBody = {
  commissionCode: "",
  commissionDate: "",
  projectName: "",
  clientUnit: "",
  testCategory: "委托检验",
  sampleSource: "施工送检",
  categoryCode: "cement",
};

export function ReceiptsList() {
  const [items, setItems] = useState<SampleReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("");
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SampleReceipt | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const mounted = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: "1", pageSize: "50" };
      // 三态过滤：接样中 → flowStatus=receiving；已提交 → flowStatus!=receiving
      if (flowFilter === "receiving") params["flowStatus"] = "receiving";
      if (flowFilter === "submitted") params["flowStatus"] = "task_assignment";
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

  const editing =
    mode.kind === "edit" ? (items.find((r) => r.id === mode.id) ?? null) : null;

  const handleSubmitReceipt = async (id: string) => {
    setSubmitting(id);
    try {
      const res = await apiClient.post<{ results: Array<{ ok: boolean; message?: string }> }>(
        API_ROUTES["/receipts/flow"],
        { ids: [id], action: "submit", operator: "current-user" },
      );
      const r = res.data?.results?.[0];
      if (r?.ok) {
        toast.success("接样单已提交到任务安排");
        await load();
      } else {
        toast.error(r?.message ?? "提交失败");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <>
      <ReceiptsHeader onNew={() => setMode({ kind: "create" })} />

      <ReceiptsFilters
        flowFilter={flowFilter}
        keyword={keyword}
        onFlowFilterChange={setFlowFilter}
        onKeywordChange={setKeyword}
        onSearch={() => void load()}
      />

      <Dialog
        open={mode.kind === "create"}
        onOpenChange={(open) => {
          if (!open) setMode({ kind: "idle" });
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>新建接样</DialogTitle>
            <DialogDescription>录入委托书基础信息（带 * 字段必填）。</DialogDescription>
          </DialogHeader>
          <ReceiptFormBody
            onSubmit={async (body) => {
              try {
                await apiClient.post(API_ROUTES["/receipts"], {
                  ...body,
                  contractId: "placeholder-contract",
                  receivedBy: "current-user",
                });
                toast.success("接样单已创建");
                setMode({ kind: "idle" });
                await load();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode.kind === "edit"}
        onOpenChange={(open) => {
          if (!open) setMode({ kind: "idle" });
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `编辑接样 ${editing.commissionCode}` : "编辑接样"}
            </DialogTitle>
            <DialogDescription>修改接样字段后保存。</DialogDescription>
          </DialogHeader>
          {editing && (
            <ReceiptFormBody
              initial={{
                commissionCode: editing.commissionCode,
                commissionDate: editing.commissionDate,
                projectName: editing.projectName ?? "",
                clientUnit: editing.clientUnit ?? "",
                testCategory: editing.testCategory,
                sampleSource: editing.sampleSource,
                categoryCode: editing.categoryCode,
              }}
              onSubmit={async (body) => {
                try {
                  await apiClient.put(`${API_ROUTES["/receipts"]}/${editing.id}`, body);
                  toast.success("接样单已更新");
                  setMode({ kind: "idle" });
                  await load();
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteTarget !== null}
        title="删除接样"
        message={deleteTarget ? `确认删除接样单 ${deleteTarget.commissionCode}？其下样品与检测记录将一并删除。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          try {
            await apiClient.delete(`${API_ROUTES["/receipts"]}/${target.id}`);
            toast.success("接样单已删除");
            await load();
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            接样列表（{total || "…"}）
          </CardTitle>
          {loading && <span className="text-xs text-slate-400">加载中…</span>}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">委托书编号</th>
                <th className="px-4 py-2 text-left">工程名称</th>
                <th className="px-4 py-2 text-left">委托单位</th>
                <th className="px-4 py-2 text-left">检测类别</th>
                <th className="px-4 py-2 text-left">流程状态</th>
                <th className="px-4 py-2 text-left">创建时间</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    （无数据）
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} data-fn="M03.F01.I01" className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link
                      to={`/receipts/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.commissionCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.projectName ?? "—"}</td>
                  <td className="px-4 py-2">{r.clientUnit ?? "—"}</td>
                  <td className="px-4 py-2">{r.testCategory}</td>
                  <td className="px-4 py-2">
                    <FlowStatusBadge status={r.flowStatus} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {r.createdAt?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.flowStatus === "receiving" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSubmitReceipt(r.id);
                        }}
                        disabled={submitting === r.id}
                        data-fn="M03.F01.I04"
                      >
                        提交
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMode({ kind: "edit", id: r.id });
                      }}
                    >
                      编辑
                    </Button>
                    {r.flowStatus === "receiving" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(r);
                        }}
                        data-fn="M03.F01.I03"
                      >
                        删除
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function ReceiptsHeader({ onNew }: { onNew: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        {/* @entry M03.F01.I01 接样管理列表页 */}
        <h1 className="text-2xl font-semibold">接样管理</h1>
        <p className="text-sm text-slate-500">
          M03.F01 接样单 CRUD 与提交（数据来自 lab-msw fixtures）
        </p>
      </div>
      {/* @entry M03.F01.I02 新建接样按钮 */}
      <Button onClick={onNew} data-fn="M03.F01.I02">
        新建接样
      </Button>
    </div>
  );
}

function ReceiptsFilters({
  flowFilter,
  keyword,
  onFlowFilterChange,
  onKeywordChange,
  onSearch,
}: {
  flowFilter: FlowFilter;
  keyword: string;
  onFlowFilterChange: (v: FlowFilter) => void;
  onKeywordChange: (v: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="mb-4 flex gap-2">
      <select
        className="border rounded h-9 px-2 text-sm bg-white"
        value={flowFilter}
        onChange={(e) => onFlowFilterChange(e.target.value as FlowFilter)}
      >
        <option value="">全部状态</option>
        <option value="receiving">接样中</option>
        <option value="submitted">已提交</option>
      </select>
      <Input
        className="max-w-sm"
        placeholder="按委托书编号搜索"
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
      />
      <Button variant="outline" onClick={onSearch}>
        搜索
      </Button>
    </div>
  );
}

function FlowStatusBadge({ status }: { status: SampleReceipt["flowStatus"] }) {
  const label = FLOW_STAGE_LABELS[status] ?? status;
  const color =
    status === "receiving"
      ? "bg-blue-100 text-blue-700"
      : status === "completed"
        ? "bg-green-100 text-green-700"
        : "bg-slate-200 text-slate-600";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${color}`}>
      {label}
    </span>
  );
}

function ReceiptFormBody({
  initial,
  onSubmit,
}: {
  initial?: ReceiptBody;
  onSubmit: (body: ReceiptBody) => Promise<void> | void;
}) {
  const [body, setBody] = useState<ReceiptBody>(initial ?? EMPTY_BODY);

  function patch<K extends keyof ReceiptBody>(key: K, value: ReceiptBody[K]) {
    setBody((b) => ({ ...b, [key]: value }));
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
        <Field label="委托书编号 *" value={body.commissionCode} onChange={(v) => patch("commissionCode", v)} />
        <Field label="委托日期 *" value={body.commissionDate} onChange={(v) => patch("commissionDate", v)} />
        <Field label="工程名称 *" value={body.projectName} onChange={(v) => patch("projectName", v)} />
        <Field label="委托单位 *" value={body.clientUnit} onChange={(v) => patch("clientUnit", v)} />
        <div className="flex flex-col gap-1">
          <Label className="text-xs">检测类别 *</Label>
          <select
            className="border rounded h-9 px-2 text-sm bg-white"
            value={body.testCategory}
            onChange={(e) => patch("testCategory", e.target.value)}
          >
            <option value="委托检验">委托检验</option>
            <option value="监督检验">监督检验</option>
            <option value="仲裁检验">仲裁检验</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">样品来源 *</Label>
          <select
            className="border rounded h-9 px-2 text-sm bg-white"
            value={body.sampleSource}
            onChange={(e) => patch("sampleSource", e.target.value)}
          >
            <option value="施工送检">施工送检</option>
            <option value="监督抽检">监督抽检</option>
            <option value="委托送样">委托送样</option>
          </select>
        </div>
        <Field label="报告类别编码 *" value={body.categoryCode} onChange={(v) => patch("categoryCode", v)} />
      </div>
      <DialogFooter className="mt-4">
        <Button onClick={() => void onSubmit(body)}>保存</Button>
      </DialogFooter>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}