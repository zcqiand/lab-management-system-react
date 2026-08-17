// M06.F08 参数界面维护 — 列表 + Dialog 弹窗（基础 + 关联参数）
//
// 简化版（对齐 nextjs REF ParamInterfaceList.tsx，单 Tab 而非 2 Tab）：
//   - 顶部筛选条（keyword input）
//   - 表格：编码 / 组件路径 / 排序
//   - 「新建」按钮 → Dialog 弹窗（code + componentPath + sortOrder）
//   - 编辑/删除同合同模式
//
// react 仓镜像要点：
//   - data-fn 用静态字面量字符串
//   - 关联参数走 /inspection-parameter-param-interfaces 端点，本批只做主表 CRUD
//
// 后续 batch 增强：2 Tab 多对多关联（基础 / 关联参数）+ 录入卡预览

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
import type { ParamInterfaceRow } from "@/types/common/inspection-param-interface";
import { ConfirmModal } from "@/components/ConfirmModal";

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; id: string };

interface ParamInterfaceBody {
  code: string;
  componentPath: string;
  sortOrder: number;
}

const EMPTY_BODY: ParamInterfaceBody = {
  code: "",
  componentPath: "",
  sortOrder: 0,
};

export function ParamInterfaceList() {
  const [items, setItems] = useState<ParamInterfaceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParamInterfaceRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ items: ParamInterfaceRow[]; total: number }>(
        API_ROUTES["/inspection-param-interfaces"],
        {
          params: {
            ...(keyword ? { keyword } : {}),
            page: 1,
            pageSize: "50",
          },
        },
      );
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(typeof res.data?.total === "number" ? res.data.total : 0);
    } finally {
      setLoading(false);
    }
  };

  const editing =
    mode.kind === "edit" ? (items.find((r) => r.code === mode.id) ?? null) : null;

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建参数界面</DialogTitle>
            <DialogDescription>
              创建一条参数界面记录（录入卡片模型）。
            </DialogDescription>
          </DialogHeader>
          <ParamInterfaceFormBody
            onSubmit={async (body) => {
              try {
                await apiClient.post(API_ROUTES["/inspection-param-interfaces"], body);
                toast.success("参数界面已创建");
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `编辑参数界面 ${editing.code}` : "编辑参数界面"}
            </DialogTitle>
            <DialogDescription>修改字段后保存。</DialogDescription>
          </DialogHeader>
          {editing && (
            <ParamInterfaceFormBody
              initial={editing}
              onSubmit={async (body) => {
                try {
                  await apiClient.put(
                    `${API_ROUTES["/inspection-param-interfaces"]}/${editing.code}`,
                    body,
                  );
                  toast.success("参数界面已更新");
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
        title="删除参数界面"
        message={deleteTarget ? `确认删除参数界面 ${deleteTarget.code}？此操作不可撤销。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          try {
            await apiClient.delete(
              `${API_ROUTES["/inspection-param-interfaces"]}/${target.code}`,
            );
            toast.success("参数界面已删除");
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
            参数界面列表（{total || "…"}）
          </CardTitle>
          {loading && <span className="text-xs text-slate-400">加载中…</span>}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">编码</th>
                <th className="px-4 py-2 text-left">组件路径</th>
                <th className="px-4 py-2 text-left">排序</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    （无数据）
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.code} data-fn="M06.F08.I01" className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.componentPath}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.sortOrder}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMode({ kind: "edit", id: r.code });
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
        <h1 className="text-2xl font-semibold">参数界面维护</h1>
        <p className="text-sm text-slate-500">
          M06.F08 参数界面（录入卡片模型）
        </p>
      </div>
      {/* @entry M06.F08.I01 新建按钮 */}
      <Button onClick={onNew} data-fn="M06.F08.I01">
        新建参数界面
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
        placeholder="按编码 / 组件路径搜索"
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

function ParamInterfaceFormBody({
  initial,
  onSubmit,
}: {
  initial?: ParamInterfaceRow;
  onSubmit: (body: ParamInterfaceBody) => Promise<void> | void;
}) {
  const [body, setBody] = useState<ParamInterfaceBody>(
    initial
      ? {
          code: initial.code,
          componentPath: initial.componentPath,
          sortOrder: initial.sortOrder,
        }
      : EMPTY_BODY,
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>编码 *</Label>
          <Input
            value={body.code}
            disabled={!!initial}
            onChange={(e) => setBody((b) => ({ ...b, code: e.target.value }))}
          />
        </div>
        <div>
          <Label>组件路径 *</Label>
          <Input
            value={body.componentPath}
            onChange={(e) => setBody((b) => ({ ...b, componentPath: e.target.value }))}
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
      </div>
      <DialogFooter>
        {/* @entry M06.F08.I01 表单内保存 */}
        <Button type="button" onClick={() => void onSubmit(body)} data-fn="M06.F08.I01">
          {initial ? "保存" : "创建"}
        </Button>
      </DialogFooter>
    </>
  );
}