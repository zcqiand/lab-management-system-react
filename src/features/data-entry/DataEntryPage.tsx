// M03.F03 数据录入 — 流程线第三环节（flowStatus='data_entry'）。
//
// 镜像 nextjs REF src/features/data-entry/DataEntryPage.tsx 简化版（669 行 → 简化骨架）：
//   - 顶部筛选 + 列表（按 flowStatus='data_entry' 过滤接样单）
//   - 每行「录入结果」按钮（M03.F03.I03）→ 打开 EntryModal
//   - EntryModal：单样品视图 + 单参数 DefaultParamCard（共享 M03.F03.I01 + I02 锚点）
//   - 「保存检测记录」按钮（M03.F03.I02）→ POST /api/test-records
//
// react 仓镜像要点：
//   - apiClient + API_ROUTES（/receipts?flowStatus=data_entry + /test-records POST/PUT + /samples GET）
//   - 弹窗 Dialog 自实现（同 Batch 2A/2B-1 模式）
//   - data-fn 静态字面量字符串
//   - 升级 ReceiptDetail 用的 ReportPreviewModal 弹窗（Batch 2B-2）

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { resolveParamInterfaceModel } from "@/features/data-entry/models/registry";
import type { InspectionParameter } from "@/types/inspection/inspection-parameter";
import type { TestRecord } from "@/types/process/test-record";

export function DataEntryPage() {
  const [items, setItems] = useState<SampleReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [entryTarget, setEntryTarget] = useState<SampleReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: "1",
        pageSize: "50",
        flowStatus: "data_entry",
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

  return (
    <>
      {/* @entry M03.F03.I01 数据录入页 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">数据录入</h1>
          <p className="text-sm text-slate-500">
            M03.F03 样品检测数据录入与人工改判（flowStatus=data_entry）
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
          <CardTitle className="text-base">待录入接样单（{total || "…"}）</CardTitle>
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
                    （无待录入接样单）
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
                  <td className="px-4 py-2">{r.assigneeName ?? "—"}</td>
                  <td className="px-4 py-2">{r.plannedTestDate ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEntryTarget(r)}
                      data-fn="M03.F03.I03"
                    >
                      录入结果
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <EntryModal
        receipt={entryTarget}
        open={entryTarget !== null}
        onClose={() => setEntryTarget(null)}
        submitting={submitting}
        setSubmitting={setSubmitting}
        onSaved={() => {
          setEntryTarget(null);
          void load();
        }}
      />
    </>
  );
}

function EntryModal({
  receipt,
  open,
  onClose,
  submitting,
  setSubmitting,
  onSaved,
}: {
  receipt: SampleReceipt | null;
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [samples, setSamples] = useState<Array<{ id: string; sampleCode: string }>>([]);
  const [parameters, setParameters] = useState<InspectionParameter[]>([]);
  const [records, setRecords] = useState<Record<string, TestRecord>>({});
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");
  const [activeParamCode, setActiveParamCode] = useState<string>("");

  useEffect(() => {
    if (!open || !receipt) return;
    (async () => {
      try {
        const [sRes, pRes, tRes] = await Promise.all([
          apiClient
            .get<{ items: Array<{ id: string; sampleCode: string }> }>(
              API_ROUTES["/samples"],
              { params: { receiptId: receipt.id, page: 1, pageSize: 50 } },
            )
            .catch(() => ({ data: { items: [] } })),
          apiClient
            .get<{ items: InspectionParameter[] }>(
              API_ROUTES["/inspection-parameters"],
              { params: { page: 1, pageSize: 200 } },
            )
            .catch(() => ({ data: { items: [] } })),
          apiClient
            .get<{ items: TestRecord[] }>(
              API_ROUTES["/test-records"],
              { params: { receiptId: receipt.id, page: 1, pageSize: 200 } },
            )
            .catch(() => ({ data: { items: [] } })),
        ]);
        const sItems = sRes.data?.items ?? [];
        const pItems = pRes.data?.items ?? [];
        const tItems = tRes.data?.items ?? [];
        setSamples(sItems);
        setParameters(pItems);
        const map: Record<string, TestRecord> = {};
        for (const t of tItems) {
          map[`${t.sampleId}#${t.parameterCode}`] = t;
        }
        setRecords(map);
        if (sItems.length > 0) setSelectedSampleId(sItems[0]!.id);
        if (pItems.length > 0) setActiveParamCode(pItems[0]!.code);
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
  }, [open, receipt]);

  if (!receipt) return null;

  const activeParam = parameters.find((p) => p.code === activeParamCode);
  const rec = selectedSampleId && activeParamCode
    ? records[`${selectedSampleId}#${activeParamCode}`]
    : undefined;
  const ModelComponent = resolveParamInterfaceModel(
    receipt.categoryCode === "cement" ? "cement-compress" : "default",
  );

  async function handleSave() {
    if (!receipt || !selectedSampleId || !activeParamCode) return;
    setSubmitting(true);
    try {
      const body = {
        receiptId: receipt.id,
        sampleId: selectedSampleId,
        parameterCode: activeParamCode,
        result: rec?.result ?? "",
        verdict: rec?.verdict ?? "",
        standardCode: rec?.standardCode ?? "",
        requirement: rec?.requirement ?? "",
      };
      if (rec?.id) {
        await apiClient.put(`${API_ROUTES["/test-records"]}/${rec.id}`, body);
      } else {
        await apiClient.post(API_ROUTES["/test-records"], body);
      }
      toast.success("检测记录已保存");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>录入结果 — {receipt.commissionCode}</DialogTitle>
          <DialogDescription>
            选择样品 + 检测参数后填写检测结果与单项评定。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          <div>
            <Label className="text-xs">样品</Label>
            <select
              className="border rounded h-9 px-2 text-sm w-full bg-white"
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
            >
              {samples.length === 0 && <option value="">（无样品）</option>}
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sampleCode}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">检测参数</Label>
            <select
              className="border rounded h-9 px-2 text-sm w-full bg-white"
              value={activeParamCode}
              onChange={(e) => setActiveParamCode(e.target.value)}
            >
              {parameters.length === 0 && <option value="">（无参数）</option>}
              {parameters.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.canonicalName || p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          {activeParam ? (
            <ModelComponent
              parameter={activeParam}
              record={rec}
              sampleId={selectedSampleId}
              standards={[]}
              stdParams={[]}
              techReqs={[]}
              config={undefined}
              onChange={(patch) => {
                if (!selectedSampleId || !activeParamCode) return;
                const key = `${selectedSampleId}#${activeParamCode}`;
                setRecords((prev) => ({
                  ...prev,
                  [key]: {
                    ...(prev[key] ?? ({} as TestRecord)),
                    id: prev[key]?.id ?? "",
                    sampleId: selectedSampleId,
                    parameterCode: activeParamCode,
                    ...patch,
                  } as TestRecord,
                }));
              }}
            />
          ) : (
            <div className="border rounded p-4 text-sm text-slate-400">
              暂无可用检测参数
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {/* @entry M03.F03.I02 保存检测记录按钮 */}
          <Button
            onClick={() => void handleSave()}
            disabled={
              submitting || !selectedSampleId || !activeParamCode
            }
            data-fn="M03.F03.I02"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DataEntryPage;