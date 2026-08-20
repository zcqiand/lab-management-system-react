// M06.F07 报告名称维护 — 列表 + Dialog 弹窗（基础信息 + extFields 模板）
//
// 简化版（对齐 nextjs REF ReportNameList.tsx，单 Tab 而非 5 Tab）：
//   - 顶部筛选条（keyword input）
//   - 表格：编码 / 简称 / 全称 / 模板路径 / 描述 / 排序
//   - 「新建」按钮 → Dialog 弹窗（基础信息 + extFields 模板）
//   - 编辑/删除同合同模式
//
// react 仓镜像要点：
//   - extFields 是 JSON 数组字符串（textarea 输入），保存时 JSON.parse
//   - data-fn 用静态字面量字符串
//   - 全表 + extFields 简单保存到后端
//
// 后续 batch 增强：5 Tab 多对多关联（基础 / 项目 / 标准 / 参数 / 扩展属性）

import { useEffect, useRef, useState } from "react";
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
import { ReportNameLinkDialog } from "@/features/report-names/ReportNameLinkDialog";
import type { InspectionReportName } from "@/types/inspection/inspection-report-name";
import { unwrapListResponse } from "@/lib/responses";
import type { ExtFieldDef } from "@/types/api";
import { ConfirmModal } from "@/components/ConfirmModal";

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; id: string };

interface ReportNameBody {
  code: string;
  name: string;
  fullName?: string;
  templatePath?: string;
  description?: string;
  sortOrder: number;
  extFieldsText: string; // 表单内 textarea 字符串
}

const EMPTY_BODY: ReportNameBody = {
  code: "",
  name: "",
  fullName: "",
  templatePath: "",
  description: "",
  sortOrder: 0,
  extFieldsText: "[]",
};

export function ReportNameList() {
  const [items, setItems] = useState<InspectionReportName[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InspectionReportName | null>(null);
  // M06.F07.I02 报告名称↔标准/参数关联弹窗
  const [linking, setLinking] = useState<InspectionReportName | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<unknown>(API_ROUTES["/report-names"], {
        params: {
          ...(keyword ? { keyword } : {}),
          page: 1,
          pageSize: "50",
        },
      });
      const { items, total } = unwrapListResponse<InspectionReportName>(res);
      setItems(items);
      setTotal(total);
    } finally {
      setLoading(false);
    }
  };

  const editing =
    mode.kind === "edit" ? (items.find((r) => r.id === mode.id) ?? null) : null;

  return (
    <>
      <Header onNew={() => setMode({ kind: "create" })} />
      <LoadTrigger load={load} />
      <Filters
        keyword={keyword}
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
            <DialogTitle>新建报告名称</DialogTitle>
            <DialogDescription>
              创建一条报告名称记录。extFields 为 JSON 数组格式，例如
              <code className="mx-1">[{`{key:"x",label:"X"}`}]</code>。
            </DialogDescription>
          </DialogHeader>
          <ReportNameFormBody
            onSubmit={async (body) => {
              const parsed = parseExtFields(body.extFieldsText);
              if (!parsed.ok) {
                toast.error(`extFields 解析失败：${parsed.error}`);
                return;
              }
              try {
                await apiClient.post(API_ROUTES["/report-names"], toPayload(body, parsed.value));
                toast.success("报告名称已创建");
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
              {editing ? `编辑报告名称 ${editing.code}` : "编辑报告名称"}
            </DialogTitle>
            <DialogDescription>修改字段后保存。</DialogDescription>
          </DialogHeader>
          {editing && (
            <ReportNameFormBody
              initial={editing}
              onSubmit={async (body) => {
                const parsed = parseExtFields(body.extFieldsText);
                if (!parsed.ok) {
                  toast.error(`extFields 解析失败：${parsed.error}`);
                  return;
                }
                try {
                  await apiClient.put(
                    `${API_ROUTES["/report-names"]}/${editing.id}`,
                    toPayload(body, parsed.value),
                  );
                  toast.success("报告名称已更新");
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
        title="删除报告名称"
        message={deleteTarget ? `确认删除报告名称 ${deleteTarget.code}？此操作不可撤销。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          try {
            await apiClient.delete(`${API_ROUTES["/report-names"]}/${target.id}`);
            toast.success("报告名称已删除");
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
            报告名称列表（{total || "…"}）
          </CardTitle>
          {loading && <span className="text-xs text-slate-400">加载中…</span>}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">编码</th>
                <th className="px-4 py-2 text-left">简称</th>
                <th className="px-4 py-2 text-left">全称</th>
                <th className="px-4 py-2 text-left">模板</th>
                <th className="px-4 py-2 text-left">排序</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    （无数据）
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} data-fn="M06.F07.I01" className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.fullName ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.templatePath ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.sortOrder}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinking(r);
                      }}
                      data-fn="M06.F07.I02"
                    >
                      关联
                    </Button>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(r);
                      }}
                    >
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* M06.F07.I02 报告名称↔标准/参数关联弹窗 */}
      {linking && (
        <ReportNameLinkDialog
          open={linking !== null}
          onOpenChange={(o) => {
            if (!o) setLinking(null);
          }}
          reportNameCode={linking.code}
          reportNameLabel={linking.name}
          onChanged={() => void load()}
        />
      )}
    </>
  );
}

function LoadTrigger({ load }: { load: () => Promise<void> }) {
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Header({ onNew }: { onNew: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">报告名称维护</h1>
        <p className="text-sm text-slate-500">
          M06.F07 报告名称 + extFields 模板（数据来自 lab-msw fixtures）
        </p>
      </div>
      {/* @entry M06.F07.I01 新建按钮（按报告名称主入口） */}
      <Button onClick={onNew} data-fn="M06.F07.I01">
        新建报告名称
      </Button>
    </div>
  );
}

function Filters({
  keyword,
  onKeywordChange,
  onSearch,
}: {
  keyword: string;
  onKeywordChange: (v: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="mb-4 flex gap-2">
      <Input
        className="max-w-sm"
        placeholder="按编码 / 名称搜索"
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

function parseExtFields(text: string): { ok: true; value: ExtFieldDef[] } | { ok: false; error: string } {
  try {
    const v = JSON.parse(text);
    if (!Array.isArray(v)) return { ok: false, error: "extFields 必须是 JSON 数组" };
    return { ok: true, value: v as ExtFieldDef[] };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function toPayload(body: ReportNameBody, extFields: ExtFieldDef[]) {
  return {
    code: body.code,
    name: body.name,
    fullName: body.fullName || undefined,
    templatePath: body.templatePath || undefined,
    description: body.description || undefined,
    sortOrder: body.sortOrder,
    extFields,
  };
}

function ReportNameFormBody({
  initial,
  onSubmit,
}: {
  initial?: InspectionReportName;
  onSubmit: (body: ReportNameBody) => Promise<void> | void;
}) {
  const [body, setBody] = useState<ReportNameBody>(
    initial
      ? {
          code: initial.code,
          name: initial.name,
          fullName: initial.fullName,
          templatePath: initial.templatePath,
          description: initial.description,
          sortOrder: initial.sortOrder,
          extFieldsText: JSON.stringify(initial.extFields ?? [], null, 2),
        }
      : EMPTY_BODY,
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
        <div>
          <Label>编码 *</Label>
          <Input
            value={body.code}
            onChange={(e) => setBody((b) => ({ ...b, code: e.target.value }))}
          />
        </div>
        <div>
          <Label>简称 *</Label>
          <Input
            value={body.name}
            onChange={(e) => setBody((b) => ({ ...b, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>全称</Label>
          <Input
            value={body.fullName ?? ""}
            onChange={(e) => setBody((b) => ({ ...b, fullName: e.target.value }))}
          />
        </div>
        <div>
          <Label>模板路径</Label>
          <Input
            value={body.templatePath ?? ""}
            onChange={(e) => setBody((b) => ({ ...b, templatePath: e.target.value }))}
          />
        </div>
        <div>
          <Label>排序</Label>
          <Input
            type="number"
            value={body.sortOrder}
            onChange={(e) =>
              setBody((b) => ({ ...b, sortOrder: Number(e.target.value) || 0 }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label>描述</Label>
          <Input
            value={body.description ?? ""}
            onChange={(e) => setBody((b) => ({ ...b, description: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label>扩展属性 extFields（JSON 数组）</Label>
          <textarea
            className="border rounded w-full h-32 px-2 py-1 text-sm font-mono bg-white"
            value={body.extFieldsText}
            onChange={(e) => setBody((b) => ({ ...b, extFieldsText: e.target.value }))}
          />
        </div>
      </div>
      <DialogFooter>
        {/* @entry M06.F07.I01 表单内保存（共用） */}
        <Button type="button" onClick={() => void onSubmit(body)} data-fn="M06.F07.I01">
          {initial ? "保存" : "创建"}
        </Button>
      </DialogFooter>
    </>
  );
}