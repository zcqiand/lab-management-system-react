// M06.F06 技术要求维护 — 列表 + 多维筛选 + Dialog 弹窗。
//
// 复合主键：(inspectionObjectCode, inspectionParameterCode, judgmentStandardCode)
// 主键由 tests 端 shape adapter 兜底 id=tr-… ；
// 多维筛选：brand / model / grade / spec（M06.F06.I01）。
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmModal } from "@/components/ConfirmModal";
import { apiClient, API_ROUTES } from "@/api/legacy-client";

interface TechReq {
  id: string;
  inspectionObjectCode: string;
  inspectionParameterCode: string;
  judgmentStandardCode: string;
  brand?: string;
  model?: string;
  grade?: string;
  spec?: string;
  minValue?: number;
  maxValue?: number;
  comparison: string;
  valueType?: string;
  judgmentMode?: string;
  verificationStatus?: string;
  remark?: string;
  objectName?: string;
  parameterName?: string;
}

interface Opt {
  code: string;
  name: string;
}

const COMPARISONS = ["≥", "≤", "=", "range", "eq"];
const COMPARISON_LABEL: Record<string, string> = {
  "≥": "≥",
  "≤": "≤",
  "=": "=",
  range: "区间",
  eq: "等于",
};

const EMPTY_FORM: Record<string, string> = {
  inspectionObjectCode: "",
  inspectionParameterCode: "",
  judgmentStandardCode: "",
  brand: "",
  model: "",
  grade: "",
  spec: "",
  minValue: "",
  maxValue: "",
  comparison: "≥",
  remark: "",
};

// @entry M06.F06.I01
export function TechnicalRequirementList() {
  const [items, setItems] = useState<TechReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objects, setObjects] = useState<Opt[]>([]);
  const [parameters, setParameters] = useState<Opt[]>([]);

  const [brandFilter, setBrandFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [specFilter, setSpecFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TechReq | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    // 服务端无多维过滤（msw 仅支持 object/parameter），客户端按 brand/model/grade/spec 二次过滤
    apiClient
      .get<{ items: TechReq[]; total: number }>(API_ROUTES["/inspection-technical-requirements"], {
        params: { page: "1", pageSize: "500" },
      })
      .then((res) => {
        const all = Array.isArray(res.data?.items) ? res.data.items : [];
        const filtered = all.filter((it) => {
          if (brandFilter && (it.brand ?? "") !== brandFilter) return false;
          if (modelFilter && (it.model ?? "") !== modelFilter) return false;
          if (gradeFilter && (it.grade ?? "") !== gradeFilter) return false;
          if (specFilter && (it.spec ?? "") !== specFilter) return false;
          return true;
        });
        setItems(filtered);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "加载失败");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiClient
      .get<{ items: Opt[] }>(API_ROUTES["/inspection-objects"], {
        params: { page: "1", pageSize: "500" },
      })
      .then((r) => setObjects(Array.isArray(r.data?.items) ? r.data.items : []))
      .catch(() => undefined);
    apiClient
      .get<{ items: Opt[] }>(API_ROUTES["/inspection-parameters"], {
        params: { page: "1", pageSize: "500" },
      })
      .then((r) => setParameters(Array.isArray(r.data?.items) ? r.data.items : []))
      .catch(() => undefined);
  }, []);

  useEffect(load, [brandFilter, modelFilter, gradeFilter, specFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setOpen(true);
  };

  const openEdit = (row: TechReq) => {
    setEditingId(row.id);
    setForm({
      inspectionObjectCode: row.inspectionObjectCode,
      inspectionParameterCode: row.inspectionParameterCode,
      judgmentStandardCode: row.judgmentStandardCode,
      brand: row.brand ?? "",
      model: row.model ?? "",
      grade: row.grade ?? "",
      spec: row.spec ?? "",
      minValue: row.minValue != null ? String(row.minValue) : "",
      maxValue: row.maxValue != null ? String(row.maxValue) : "",
      comparison: row.comparison ?? "≥",
      remark: row.remark ?? "",
    });
    setSaveError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaveError(null);
    const payload = {
      inspectionObjectCode: form.inspectionObjectCode,
      inspectionParameterCode: form.inspectionParameterCode,
      judgmentStandardCode: form.judgmentStandardCode,
      brand: form.brand || undefined,
      model: form.model || undefined,
      grade: form.grade || undefined,
      spec: form.spec || undefined,
      minValue: form.minValue === "" ? undefined : Number(form.minValue),
      maxValue: form.maxValue === "" ? undefined : Number(form.maxValue),
      comparison: form.comparison,
      remark: form.remark || undefined,
    };
    try {
      if (editingId) {
        await apiClient.put(
          `${API_ROUTES["/inspection-technical-requirements"]}/${editingId}`,
          payload,
        );
      } else {
        await apiClient.post(
          API_ROUTES["/inspection-technical-requirements"],
          payload,
        );
      }
      toast.success(editingId ? "已更新" : "已创建");
      setOpen(false);
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "保存失败";
      setSaveError(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await apiClient.delete(
        `${API_ROUTES["/inspection-technical-requirements"]}/${deleting.id}`,
      );
      toast.success("已删除");
      setDeleting(null);
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "删除失败";
      setDeleteError(msg);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-fn="M06.F06.I01">
      <Card>
        <CardHeader>
          <CardTitle>技术要求维护</CardTitle>
          <CardDescription>
            M06.F06 技术要求 — 四维度匹配：牌号 / 型号 / 等级 / 规格（brand × model × grade × spec）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="牌号筛选"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="牌号"
              className="w-32"
            />
            <Input
              aria-label="型号筛选"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="型号"
              className="w-32"
            />
            <Input
              aria-label="等级筛选"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              placeholder="等级"
              className="w-32"
            />
            <Input
              aria-label="规格筛选"
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              placeholder="规格"
              className="w-32"
            />
            <Button onClick={openCreate} data-fn="M06.F06.I02">
              <Plus className="mr-1 h-4 w-4" /> 新建技术要求
            </Button>
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {items.length === 0 && !loading ? (
            <EmptyState title="暂无技术要求" description="点击右上角新建一条" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>检测项目</TableHead>
                  <TableHead>检测参数</TableHead>
                  <TableHead>判定标准</TableHead>
                  <TableHead>牌号</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>判定方式</TableHead>
                  <TableHead>上限</TableHead>
                  <TableHead>下限</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.inspectionObjectCode}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.inspectionParameterCode}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.judgmentStandardCode}
                    </TableCell>
                    <TableCell>{row.brand ?? "-"}</TableCell>
                    <TableCell>{row.model ?? "-"}</TableCell>
                    <TableCell>{row.grade ?? "-"}</TableCell>
                    <TableCell>{row.spec ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {COMPARISON_LABEL[row.comparison] ?? row.comparison}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.maxValue ?? "-"}</TableCell>
                    <TableCell>{row.minValue ?? "-"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => openEdit(row)}
                        data-fn="M06.F06.I02"
                        aria-label={`编辑 ${row.id}`}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setDeleting(row);
                          setDeleteError(null);
                        }}
                        data-fn="M06.F06.I03"
                        aria-label={`删除 ${row.id}`}
                        className="text-red-600"
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="text-sm text-muted-foreground">共 {items.length} 条</div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑技术要求" : "新建技术要求"}</DialogTitle>
            <DialogDescription>
              复合主键：检测项目 + 检测参数 + 判定标准；引用保护由 M06.F06.I03 兜底
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {saveError && (
              <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {saveError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tr-object">检测项目</Label>
                <Select
                  value={form.inspectionObjectCode || "_none"}
                  onValueChange={(v) =>
                    setForm({ ...form, inspectionObjectCode: v === "_none" ? "" : v })
                  }
                >
                  <SelectTrigger id="tr-object">
                    <SelectValue placeholder="选择检测项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">未选择</SelectItem>
                    {objects.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.code} {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tr-parameter">检测参数</Label>
                <Select
                  value={form.inspectionParameterCode || "_none"}
                  onValueChange={(v) =>
                    setForm({ ...form, inspectionParameterCode: v === "_none" ? "" : v })
                  }
                >
                  <SelectTrigger id="tr-parameter">
                    <SelectValue placeholder="选择检测参数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">未选择</SelectItem>
                    {parameters.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.code} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tr-standard">判定标准</Label>
              <Input
                id="tr-standard"
                value={form.judgmentStandardCode}
                onChange={(e) => setForm({ ...form, judgmentStandardCode: e.target.value })}
                placeholder="如 GB 175-2023"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tr-brand">牌号</Label>
                <Input
                  id="tr-brand"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tr-model">型号</Label>
                <Input
                  id="tr-model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tr-grade">等级</Label>
                <Input
                  id="tr-grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tr-spec">规格</Label>
                <Input
                  id="tr-spec"
                  value={form.spec}
                  onChange={(e) => setForm({ ...form, spec: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="tr-comparison">判定方式</Label>
                <Select
                  value={form.comparison}
                  onValueChange={(v) => setForm({ ...form, comparison: v })}
                >
                  <SelectTrigger id="tr-comparison">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPARISONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {COMPARISON_LABEL[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tr-min">下限</Label>
                <Input
                  id="tr-min"
                  type="number"
                  value={form.minValue}
                  onChange={(e) => setForm({ ...form, minValue: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tr-max">上限</Label>
                <Input
                  id="tr-max"
                  type="number"
                  value={form.maxValue}
                  onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tr-remark">备注</Label>
              <Input
                id="tr-remark"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleting !== null}
        title="删除技术要求"
        message={
          <>
            确定删除
            <span className="font-mono">
              {" "}
              {deleting?.inspectionObjectCode}/{deleting?.inspectionParameterCode}
            </span>{" "}
            的技术要求？被引用的技术要求不可删除（M06.F06.I03 引用保护）。
            {deleteError && (
              <div role="alert" className="mt-2 text-red-600">
                {deleteError}
              </div>
            )}
          </>
        }
        loading={deletingBusy}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

export default TechnicalRequirementList;
