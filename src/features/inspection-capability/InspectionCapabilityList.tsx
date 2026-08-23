// M06 检测能力 4 主表列表（specialty / object / parameter / standard）。
//
// 镜像 nextjs InspectionCapabilityPage.tsx 的多资源模式（react 仓无
// react-router useParams，用 prop `resource` 区分；page wrappers 负责传值）。
//
// 适配层说明：
//   - 数据由 tests/helpers/seed.ts installShapeAdapters wrapDict 提供
//     （id=code、keyword 过滤、inspectionObjectCode / inspectionSpecialtyCode
//     junction 反查）。组件直读 res.data.items/total 即可。
//   - 计算方法 / 技术要求是复合主键独立页，不在本组件范围。
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmModal } from "@/components/ConfirmModal";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import { ParameterStandardLinkDialog } from "@/features/inspection-capability/ParameterStandardLinkDialog";
import { unwrapListResponse } from "@/lib/responses";
import type {
  InspectionSpecialty,
  InspectionObject,
  InspectionParameter,
  InspectionStandard,
} from "@/types/inspection";

export type CapabilityResource = "specialties" | "objects" | "parameters" | "standards";

interface Props {
  resource: CapabilityResource;
}

interface ListItemBase {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
  enabled?: boolean;
  isOfficial?: boolean;
}

type ListItem = ListItemBase & {
  officialNo?: string;
  sourceType?: string;
  status?: string;
  unit?: string;
  version?: string;
  parameterNames?: string;
  standardCodes?: string;
  objectNames?: string;
};

const TITLES: Record<CapabilityResource, string> = {
  specialties: "检测专项维护",
  objects: "检测项目维护",
  parameters: "检测参数维护",
  standards: "检测标准维护",
};

const HINTS: Record<CapabilityResource, string> = {
  specialties: "InspectionSpecialty 实体码表维护，机构检测能力字典根",
  objects: "InspectionObject 实体码表维护，按检测专项过滤；支持项目↔专项/参数关联",
  parameters: "InspectionParameter 实体码表维护，列表按专项/项目/标准过滤",
  standards: "InspectionStandard 实体码表维护（含状态：active/superseded/draft）",
};

const CREATE_LABELS: Record<CapabilityResource, string> = {
  specialties: "新建检测专项",
  objects: "新建检测项目",
  parameters: "新建检测参数",
  standards: "新建检测标准",
};

const ROUTES: Record<CapabilityResource, string> = {
  specialties: API_ROUTES["/inspection-specialties"],
  objects: API_ROUTES["/inspection-objects"],
  parameters: API_ROUTES["/inspection-parameters"],
  standards: API_ROUTES["/inspection-standards"],
};

const FN_ID: Record<CapabilityResource, string> = {
  specialties: "M06.F01.I01",
  objects: "M06.F02.I01",
  parameters: "M06.F03.I01",
  standards: "M06.F04.I01",
};

const FN_CREATE: Record<CapabilityResource, string> = {
  specialties: "M06.F01.I01",
  objects: "M06.F02.I02",
  parameters: "M06.F03.I01",
  standards: "M06.F04.I02",
};

const FN_DELETE: Record<CapabilityResource, string> = {
  specialties: "M06.F01.I01",
  objects: "M06.F02.I01",
  parameters: "M06.F03.I01",
  standards: "M06.F04.I01",
};

const STANDARD_STATUS_CN: Record<string, string> = {
  active: "现行",
  superseded: "被替代",
  draft: "草案",
};

const PAGE_SIZE = 50;

function isOfficialRow(r: CapabilityResource, item: ListItem): boolean {
  if (r === "specialties" || r === "objects") return item.isOfficial === true;
  if (r === "parameters") return item.sourceType === "official";
  return false;
}

// @entry M06.F01.I01
// @entry M06.F02.I01
// @entry M06.F03.I01
// @entry M06.F04.I01
// @entry M06.F02.I02
// @entry M06.F04.I02
// M06.F02.I02 项目↔专项/参数关联（行内 / 新建表单下拉选检测专项编码）
// M06.F04.I02 标准 CRUD（行内 编辑/删除 按钮）
// M06.F03.I02 参数↔标准关联（parameters 行内「关联标准」→ ParameterStandardLinkDialog）
export function InspectionCapabilityList({ resource }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [objectFilter, setObjectFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [specialtyOptions, setSpecialtyOptions] = useState<InspectionSpecialty[]>([]);
  const [objectOptions, setObjectOptions] = useState<InspectionObject[]>([]);
  const [standardOptions, setStandardOptions] = useState<InspectionStandard[]>([]);
  const [parameterOptions, setParameterOptions] = useState<InspectionParameter[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [deleting, setDeleting] = useState<ListItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean | number>>({});
  // M06.F03.I02 参数↔标准关联弹窗（parameters 资源专属）
  const [linkingParam, setLinkingParam] = useState<ListItem | null>(null);

  const resetForm = () => {
    if (resource === "specialties") {
      setForm({
        code: "",
        name: "",
        officialNo: "",
        isOfficial: false,
        enabled: true,
        sortOrder: "999",
      });
    } else if (resource === "objects") {
      setForm({
        code: "",
        name: "",
        inspectionSpecialtyCode: "",
        sourceProjectNo: "",
        sourceProjectName: "",
        isOptionalForQualification: false,
        isOfficial: false,
        enabled: true,
        sortOrder: "999",
      });
    } else if (resource === "parameters") {
      setForm({ code: "", name: "", unit: "", sourceType: "custom", sortOrder: "999" });
    } else {
      setForm({
        code: "",
        name: "",
        version: "",
        status: "active",
        sourceDocumentId: "",
        sortOrder: "999",
      });
    }
  };

  const load = () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: "1", pageSize: String(PAGE_SIZE) };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (resource === "objects" && specialtyFilter) {
      params.inspectionSpecialtyCode = specialtyFilter;
    }
    if (resource === "standards") {
      if (specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter;
      if (objectFilter) params.inspectionObjectCode = objectFilter;
    }
    if (resource === "parameters") {
      if (specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter;
      if (objectFilter) params.inspectionObjectCode = objectFilter;
      if (standardFilter) params.inspectionStandardCode = standardFilter;
    }
    apiClient
      .get<unknown>(ROUTES[resource], { params })
      .then((res) => {
        const { items: listItems, total: listTotal } = unwrapListResponse<ListItem>(res);
        setItems(listItems);
        setTotal(listTotal);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "加载失败");
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [resource, keyword, specialtyFilter, objectFilter, standardFilter]);

  // 专项下拉选项（objects/standards/parameters 视图）
  useEffect(() => {
    if (resource === "specialties") {
      setSpecialtyOptions([]);
      return;
    }
    apiClient
      .get<unknown>(ROUTES.specialties, {
        params: { page: "1", pageSize: "100" },
      })
      .then((res) =>
        setSpecialtyOptions(unwrapListResponse<InspectionSpecialty>(res).items),
      )
      .catch(() => undefined);
  }, [resource]);

  // 项目下拉选项（standards/parameters，按专项过滤）
  useEffect(() => {
    if (resource !== "standards" && resource !== "parameters") {
      setObjectOptions([]);
      return;
    }
    const params: Record<string, string> = { page: "1", pageSize: "200" };
    if (specialtyFilter) params.inspectionSpecialtyCode = specialtyFilter;
    apiClient
      .get<unknown>(ROUTES.objects, { params })
      .then((res) => setObjectOptions(unwrapListResponse<InspectionObject>(res).items))
      .catch(() => undefined);
  }, [resource, specialtyFilter]);

  // 标准下拉选项（parameters 视图，按项目过滤）
  useEffect(() => {
    if (resource !== "parameters") {
      setStandardOptions([]);
      return;
    }
    const params: Record<string, string> = { page: "1", pageSize: "200" };
    if (objectFilter) params.inspectionObjectCode = objectFilter;
    apiClient
      .get<unknown>(ROUTES.standards, { params })
      .then((res) =>
        setStandardOptions(unwrapListResponse<InspectionStandard>(res).items),
      )
      .catch(() => undefined);
  }, [resource, objectFilter]);

  // 参数下拉（objects 新建/编辑用）
  useEffect(() => {
    if (resource !== "objects") {
      setParameterOptions([]);
      return;
    }
    apiClient
      .get<unknown>(ROUTES.parameters, {
        params: { page: "1", pageSize: "200" },
      })
      .then((res) =>
        setParameterOptions(unwrapListResponse<InspectionParameter>(res).items),
      )
      .catch(() => undefined);
  }, [resource]);

  const openCreate = () => {
    setEditing(null);
    setSaveError(null);
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (item: ListItem) => {
    setEditing(item);
    setSaveError(null);
    const next: Record<string, string | boolean | number> = {};
    Object.entries(item).forEach(([k, v]) => {
      if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") {
        next[k] = v;
      }
    });
    next.sortOrder = Number(item.sortOrder ?? 999);
    setForm(next);
  };

  const save = async () => {
    setSaveError(null);
    const payload: Record<string, unknown> = { code: form.code, name: form.name };
    if (resource === "specialties") {
      payload.officialNo = form.officialNo || undefined;
      payload.isOfficial = form.isOfficial === true;
      payload.enabled = form.enabled === true;
    } else if (resource === "objects") {
      payload.inspectionSpecialtyCode = form.inspectionSpecialtyCode || undefined;
      payload.sourceProjectNo = form.sourceProjectNo || undefined;
      payload.sourceProjectName = form.sourceProjectName || undefined;
      payload.isOptionalForQualification = form.isOptionalForQualification === true;
      payload.isOfficial = form.isOfficial === true;
      payload.enabled = form.enabled === true;
    } else if (resource === "parameters") {
      payload.unit = form.unit || undefined;
      payload.sourceType = form.sourceType || "custom";
    } else {
      payload.version = form.version || undefined;
      payload.status = form.status || "active";
      payload.sourceDocumentId = form.sourceDocumentId || undefined;
    }
    payload.sortOrder = Number(form.sortOrder) || 999;
    try {
      if (editing) {
        await apiClient.put(`${ROUTES[resource]}/${editing.id}`, payload);
      } else {
        await apiClient.post(ROUTES[resource], payload);
      }
      toast.success(editing ? "已更新" : "已创建");
      setCreateOpen(false);
      setEditing(null);
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
      await apiClient.delete(`${ROUTES[resource]}/${deleting.id}`);
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

  const renderColumns = (item: ListItem): ReactNode[] => {
    const cells: ReactNode[] = [
      <span key="code" className="font-mono text-xs">
        {item.code}
      </span>,
      <span key="name">{item.name}</span>,
    ];
    if (resource === "specialties") {
      cells.push(<span key="officialNo">{item.officialNo ?? "-"}</span>);
      cells.push(
        item.isOfficial ? (
          <Badge key="off">官方</Badge>
        ) : (
          <Badge key="off" variant="outline">
            自定义
          </Badge>
        ),
      );
      cells.push(
        item.enabled ? (
          <Badge key="en">启用</Badge>
        ) : (
          <Badge key="en" variant="outline">
            停用
          </Badge>
        ),
      );
    } else if (resource === "objects") {
      cells.push(
        <span key="param" className="text-xs text-muted-foreground">
          {item.parameterNames ?? "-"}
        </span>,
      );
      cells.push(
        <span key="std" className="text-xs text-muted-foreground">
          {item.standardCodes ?? "-"}
        </span>,
      );
      cells.push(
        item.enabled ? (
          <Badge key="en">启用</Badge>
        ) : (
          <Badge key="en" variant="outline">
            停用
          </Badge>
        ),
      );
    } else if (resource === "parameters") {
      cells.push(<span key="unit">{item.unit ?? "-"}</span>);
      cells.push(
        <span key="obj" className="text-xs text-muted-foreground">
          {item.objectNames ?? "-"}
        </span>,
      );
      cells.push(
        <span key="std" className="text-xs text-muted-foreground">
          {item.standardCodes ?? "-"}
        </span>,
      );
    } else {
      cells.push(<span key="ver">{item.version ?? "-"}</span>);
      cells.push(
        <Badge key="status" variant={item.status === "active" ? "default" : "outline"}>
          {STANDARD_STATUS_CN[item.status ?? ""] ?? item.status ?? "-"}
        </Badge>,
      );
      cells.push(
        <span key="param" className="text-xs text-muted-foreground">
          {item.parameterNames ?? "-"}
        </span>,
      );
    }
    return cells;
  };

  const columnHeaders: string[] = (() => {
    if (resource === "specialties")
      return ["编码", "名称", "官方序号", "官方/自定义", "状态"];
    if (resource === "objects") return ["编码", "名称", "检测参数", "检测标准", "状态"];
    if (resource === "parameters")
      return ["编码", "名称", "单位", "检测项目", "检测标准"];
    return ["编码", "名称", "版本", "状态", "检测参数"];
  })();

  return (
    <div className="space-y-4" data-fn={FN_ID[resource]}>
      <Card>
        <CardHeader>
          <CardTitle>{TITLES[resource]}</CardTitle>
          <CardDescription>{HINTS[resource]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索编码/名称"
              className="w-56"
            />
            {resource !== "specialties" && (
              <Select
                value={specialtyFilter || "_all"}
                onValueChange={(v) => {
                  setSpecialtyFilter(v === "_all" ? "" : v);
                  setObjectFilter("");
                  setStandardFilter("");
                }}
              >
                <SelectTrigger aria-label="检测专项筛选" className="w-40">
                  <SelectValue placeholder="全部专项" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">全部专项</SelectItem>
                  {specialtyOptions.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(resource === "standards" || resource === "parameters") && (
              <Select
                value={objectFilter || "_all"}
                onValueChange={(v) => {
                  setObjectFilter(v === "_all" ? "" : v);
                  setStandardFilter("");
                }}
              >
                <SelectTrigger aria-label="检测项目筛选" className="w-40">
                  <SelectValue placeholder="全部项目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">全部项目</SelectItem>
                  {objectOptions.map((o) => (
                    <SelectItem key={o.code} value={o.code}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {resource === "parameters" && (
              <Select
                value={standardFilter || "_all"}
                onValueChange={(v) => setStandardFilter(v === "_all" ? "" : v)}
              >
                <SelectTrigger aria-label="检测标准筛选" className="w-40">
                  <SelectValue placeholder="全部标准" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">全部标准</SelectItem>
                  {standardOptions.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={openCreate} data-fn={FN_CREATE[resource]}>
              <Plus className="mr-1 h-4 w-4" /> {CREATE_LABELS[resource]}
            </Button>
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {items.length === 0 && !loading ? (
            <EmptyState
              title={`暂无${TITLES[resource]}`}
              description="试试清空筛选或新建一行"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columnHeaders.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {renderColumns(item).map((c, i) => (
                      <TableCell key={i}>{c}</TableCell>
                    ))}
                    <TableCell className="text-xs whitespace-nowrap">
                      {resource === "parameters" && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setLinkingParam(item)}
                          data-fn="M06.F03.I02"
                          aria-label={`关联标准 ${item.code}`}
                        >
                          关联标准
                        </Button>
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => openEdit(item)}
                        data-fn={FN_CREATE[resource]}
                        aria-label={`编辑 ${item.code}`}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setDeleting(item);
                          setDeleteError(null);
                        }}
                        data-fn={FN_DELETE[resource]}
                        aria-label={`删除 ${item.code}`}
                        disabled={isOfficialRow(resource, item)}
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

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>共 {total} 条</span>
          </div>
        </CardContent>
      </Card>

      {/* 新建/编辑 Dialog */}
      <Dialog
        open={createOpen || editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `编辑${TITLES[resource]}` : CREATE_LABELS[resource]}
            </DialogTitle>
            <DialogDescription>
              {resource === "objects"
                ? "M06.F02.I02 项目↔专项/参数关联：选择检测专项编码，把项目挂到专项下"
                : "填写后保存"}
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
                <Label htmlFor="code">编码</Label>
                <Input
                  id="code"
                  value={(form.code as string) ?? ""}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  disabled={!!editing}
                />
              </div>
              <div>
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={(form.name as string) ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            {resource === "specialties" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="officialNo">官方序号</Label>
                  <Input
                    id="officialNo"
                    value={(form.officialNo as string) ?? ""}
                    onChange={(e) => setForm({ ...form, officialNo: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="isOfficial"
                    checked={form.isOfficial === true}
                    onCheckedChange={(v) => setForm({ ...form, isOfficial: v === true })}
                  />
                  <Label htmlFor="isOfficial">官方</Label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="enabled"
                    checked={form.enabled === true}
                    onCheckedChange={(v) => setForm({ ...form, enabled: v === true })}
                  />
                  <Label htmlFor="enabled">启用</Label>
                </div>
              </div>
            )}
            {resource === "objects" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="inspectionSpecialtyCode">检测专项编码</Label>
                  <Select
                    value={(form.inspectionSpecialtyCode as string) ?? "_none"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        inspectionSpecialtyCode: v === "_none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger id="inspectionSpecialtyCode">
                      <SelectValue placeholder="选择检测专项" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">未选择</SelectItem>
                      {specialtyOptions.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.code} {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sourceProjectNo">来源行号</Label>
                    <Input
                      id="sourceProjectNo"
                      value={(form.sourceProjectNo as string) ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, sourceProjectNo: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="sourceProjectName">来源行名称</Label>
                    <Input
                      id="sourceProjectName"
                      value={(form.sourceProjectName as string) ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, sourceProjectName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox
                      id="isOfficial"
                      checked={form.isOfficial === true}
                      onCheckedChange={(v) =>
                        setForm({ ...form, isOfficial: v === true })
                      }
                    />
                    <Label htmlFor="isOfficial">官方</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox
                      id="enabled"
                      checked={form.enabled === true}
                      onCheckedChange={(v) => setForm({ ...form, enabled: v === true })}
                    />
                    <Label htmlFor="enabled">启用</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox
                      id="isOptionalForQualification"
                      checked={form.isOptionalForQualification === true}
                      onCheckedChange={(v) =>
                        setForm({ ...form, isOptionalForQualification: v === true })
                      }
                    />
                    <Label htmlFor="isOptionalForQualification">资质可选</Label>
                  </div>
                </div>
                <div>
                  <Label>已选检测参数（M06.F02.I02 关联）</Label>
                  <div className="text-xs text-muted-foreground mt-1">
                    {parameterOptions.length} 个候选参数；保存时由 M06.F03.I02 在 form
                    关联。 本批实现只透出选择器，关联持久化由后续 batch 补。
                  </div>
                </div>
              </div>
            )}
            {resource === "parameters" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="unit">单位</Label>
                  <Input
                    id="unit"
                    value={(form.unit as string) ?? ""}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sourceType">来源类型</Label>
                  <Select
                    value={(form.sourceType as string) ?? "custom"}
                    onValueChange={(v) => setForm({ ...form, sourceType: v })}
                  >
                    <SelectTrigger id="sourceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="official">官方</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {resource === "standards" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="version">版本</Label>
                  <Input
                    id="version"
                    value={(form.version as string) ?? ""}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">状态</Label>
                  <Select
                    value={(form.status as string) ?? "active"}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">现行</SelectItem>
                      <SelectItem value="superseded">被替代</SelectItem>
                      <SelectItem value="draft">草案</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sourceDocumentId">来源文件</Label>
                  <Input
                    id="sourceDocumentId"
                    value={(form.sourceDocumentId as string) ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, sourceDocumentId: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                value={(form.sortOrder as string) ?? "999"}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditing(null);
              }}
            >
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleting !== null}
        title={`删除${TITLES[resource]}`}
        message={
          <>
            确定删除 <span className="font-mono">{deleting?.code ?? ""}</span>？
            官方数据与被引用数据不可删除。
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

      {/* M06.F03.I02 参数↔标准关联弹窗（parameters 资源） */}
      {resource === "parameters" && linkingParam && (
        <ParameterStandardLinkDialog
          open={linkingParam !== null}
          onOpenChange={(o) => {
            if (!o) setLinkingParam(null);
          }}
          parameterCode={linkingParam.code}
          parameterName={linkingParam.name}
          onChanged={load}
        />
      )}
    </div>
  );
}

export default InspectionCapabilityList;
