// M06.F05 计算方法维护 — 列表 + Dialog 弹窗。
//
// 复合主键：(inspectionObjectCode, inspectionParameterCode)——契约 PUT/DELETE
// /api/calculation-methods/{objectCode}/{parameterCode}（orval 组合键寻址，无 id 列）。
// 契约 list 参数只有 inspectionObjectCode/inspectionParameterCode（无 keyword/
// page/pageSize）——关键字搜索改为前端过滤。
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
import {
  calculationMethodsCreateCalculationMethod,
  calculationMethodsDeleteCalculationMethod,
  calculationMethodsListCalculationMethods,
  calculationMethodsUpdateCalculationMethod,
} from "@/api/endpoints/calculation-methods/calculation-methods";
import {
  inspectionDictionaryListObjects,
  inspectionDictionaryListParameters,
  inspectionDictionaryListStandards,
} from "@/api/endpoints/inspection-dictionary/inspection-dictionary";
import type { CalculationMethod } from "@/api/endpoints/model/calculationMethod";
import type { CalculationAlgorithmType } from "@/api/endpoints/model/calculationAlgorithmType";

/** 行结构 = 契约 CalculationMethod（复合键寻址，无 id）。 */
type CalcRule = CalculationMethod;

interface Opt {
  code: string;
  name: string;
}

const ALGORITHMS: Array<{ value: string; label: string }> = [
  { value: "simple_avg", label: "简单平均" },
  { value: "compressive_strength", label: "抗压强度" },
  { value: "flexural_strength", label: "抗折强度" },
  { value: "steel_tensile", label: "钢材拉伸" },
  { value: "formula", label: "公式计算" },
  { value: "manual", label: "人工判定" },
];

const ALGO_LABEL = Object.fromEntries(ALGORITHMS.map((a) => [a.value, a.label]));

const EMPTY_FORM: Record<string, string> = {
  inspectionObjectCode: "",
  inspectionParameterCode: "",
  testingStandardCode: "",
  algorithmType: "manual",
  specimenCount: "1",
  roundingRule: "",
  remark: "",
};

// @entry M06.F05.I01
export function CalculationMethodList() {
  const [items, setItems] = useState<CalcRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objects, setObjects] = useState<Opt[]>([]);
  const [parameters, setParameters] = useState<Opt[]>([]);
  const [standards, setStandards] = useState<Opt[]>([]);
  const [keyword, setKeyword] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalcRule | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CalcRule | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    calculationMethodsListCalculationMethods()
      .then((res) => {
        setItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "加载失败");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  /** 契约 list 无 keyword 参数——前端按 组合键/备注 模糊过滤。 */
  const kw = keyword.trim().toLowerCase();
  const matchesKeyword = (row: CalcRule): boolean =>
    !kw ||
    row.inspectionObjectCode.toLowerCase().includes(kw) ||
    row.inspectionParameterCode.toLowerCase().includes(kw) ||
    (row.remark ?? "").toLowerCase().includes(kw);

  /** 契约实体不带 objectName/parameterName 冗余列——由字典 code 反查。 */
  const objectNameByCode = new Map(objects.map((o) => [o.code, o.name]));
  const parameterNameByCode = new Map(parameters.map((p) => [p.code, p.name]));

  useEffect(() => {
    inspectionDictionaryListObjects({ page: 1, pageSize: 200 })
      .then((r) => setObjects(r.data?.items ?? []))
      .catch(() => undefined);
    inspectionDictionaryListParameters({ page: 1, pageSize: 200 })
      .then((r) => setParameters(r.data?.items ?? []))
      .catch(() => undefined);
    inspectionDictionaryListStandards({ page: 1, pageSize: 200 })
      .then((r) => setStandards(r.data?.items ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSaveError(null);
    setOpen(true);
  };

  const openEdit = (row: CalcRule) => {
    setEditing(row);
    setForm({
      inspectionObjectCode: row.inspectionObjectCode,
      inspectionParameterCode: row.inspectionParameterCode,
      testingStandardCode: row.testingStandardCode ?? "",
      algorithmType: row.algorithmType,
      specimenCount: String(row.specimenCount ?? 1),
      roundingRule: row.roundingRule ?? "",
      remark: row.remark ?? "",
    });
    setSaveError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaveError(null);
    const payload = {
      inspectionObjectCode: form.inspectionObjectCode ?? "",
      inspectionParameterCode: form.inspectionParameterCode ?? "",
      testingStandardCode: form.testingStandardCode || undefined,
      algorithmType: form.algorithmType as CalculationAlgorithmType,
      specimenCount: Number(form.specimenCount) || 1,
      roundingRule: form.roundingRule || undefined,
      remark: form.remark || undefined,
    };
    try {
      if (editing) {
        await calculationMethodsUpdateCalculationMethod(
          editing.inspectionObjectCode,
          editing.inspectionParameterCode,
          payload,
        );
      } else {
        await calculationMethodsCreateCalculationMethod(payload);
      }
      toast.success(editing ? "已更新" : "已创建");
      setOpen(false);
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "保存失败";
      setSaveError(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await calculationMethodsDeleteCalculationMethod(
        deleting.inspectionObjectCode,
        deleting.inspectionParameterCode,
      );
      toast.success("已删除");
      setDeleting(null);
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "删除失败";
      setDeleteError(msg);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-fn="M06.F05.I01">
      <Card>
        <CardHeader>
          <CardTitle>计算方法维护</CardTitle>
          <CardDescription>
            M06.F05 计算方法（复合主键：检测项目 + 检测参数）——算法类型 + 试件数量 +
            修约规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label="搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索项目/参数"
              className="w-56"
            />
            <Button onClick={openCreate} data-fn="M06.F05.I01">
              <Plus className="mr-1 h-4 w-4" /> 新建计算方法
            </Button>
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {items.length === 0 && !loading ? (
            <EmptyState title="暂无计算方法" description="点击右上角新建一条" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>检测项目</TableHead>
                  <TableHead>检测参数</TableHead>
                  <TableHead>判定标准</TableHead>
                  <TableHead>算法类型</TableHead>
                  <TableHead>试件数量</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.filter(matchesKeyword).map((row) => (
                  <TableRow key={`${row.inspectionObjectCode}/${row.inspectionParameterCode}`}>
                    <TableCell>
                      <div className="font-mono text-xs">{row.inspectionObjectCode}</div>
                      {objectNameByCode.get(row.inspectionObjectCode) && (
                        <div className="text-xs text-muted-foreground">
                          {objectNameByCode.get(row.inspectionObjectCode)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {row.inspectionParameterCode}
                      </div>
                      {parameterNameByCode.get(row.inspectionParameterCode) && (
                        <div className="text-xs text-muted-foreground">
                          {parameterNameByCode.get(row.inspectionParameterCode)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.testingStandardCode ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ALGO_LABEL[row.algorithmType] ?? row.algorithmType}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.specimenCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.remark ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => openEdit(row)}
                        data-fn="M06.F05.I01"
                        aria-label={`编辑 ${row.inspectionObjectCode}/${row.inspectionParameterCode}`}
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
                        data-fn="M06.F05.I01"
                        aria-label={`删除 ${row.inspectionObjectCode}/${row.inspectionParameterCode}`}
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

          <div className="text-sm text-muted-foreground">
            共 {items.filter(matchesKeyword).length} 条
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑计算方法" : "新建计算方法"}</DialogTitle>
            <DialogDescription>
              复合主键：检测项目 + 检测参数（PUT/DELETE 按组合键寻址）
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
                <Label htmlFor="inspectionObjectCode">检测项目</Label>
                <Select
                  value={form.inspectionObjectCode || "_none"}
                  onValueChange={(v) =>
                    setForm({ ...form, inspectionObjectCode: v === "_none" ? "" : v })
                  }
                >
                  <SelectTrigger id="inspectionObjectCode">
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
                <Label htmlFor="inspectionParameterCode">检测参数</Label>
                <Select
                  value={form.inspectionParameterCode || "_none"}
                  onValueChange={(v) =>
                    setForm({ ...form, inspectionParameterCode: v === "_none" ? "" : v })
                  }
                >
                  <SelectTrigger id="inspectionParameterCode">
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
              <Label htmlFor="testingStandardCode">判定标准（可选）</Label>
              <Select
                value={form.testingStandardCode || "_none"}
                onValueChange={(v) =>
                  setForm({ ...form, testingStandardCode: v === "_none" ? "" : v })
                }
              >
                <SelectTrigger id="testingStandardCode">
                  <SelectValue placeholder="选择标准" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">不指定</SelectItem>
                  {standards.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="algorithmType">算法类型</Label>
                <Select
                  value={form.algorithmType}
                  onValueChange={(v) => setForm({ ...form, algorithmType: v })}
                >
                  <SelectTrigger id="algorithmType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALGORITHMS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="specimenCount">试件数量</Label>
                <Input
                  id="specimenCount"
                  type="number"
                  value={form.specimenCount}
                  onChange={(e) => setForm({ ...form, specimenCount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="roundingRule">修约规则</Label>
                <Input
                  id="roundingRule"
                  value={form.roundingRule}
                  onChange={(e) => setForm({ ...form, roundingRule: e.target.value })}
                  placeholder="如 修约到 0.1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="remark">备注</Label>
              <Input
                id="remark"
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
        title="删除计算方法"
        message={
          <>
            确定删除
            <span className="font-mono">
              {" "}
              {deleting?.inspectionObjectCode} / {deleting?.inspectionParameterCode}{" "}
            </span>
            ？
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

export default CalculationMethodList;
