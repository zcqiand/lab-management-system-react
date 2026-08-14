// 参考示例：一个完整的 CRUD 列表页，演示 PageHeader / DataTable(三态) /
// PaginationBar / Dialog+Field / ConfirmDialog / DropdownMenu 的标准拼法。
// 已过 L1(prettier) / L2(eslint) / L3(tsc) 三门。可整段复制后改成你的领域。
// 注意 createColumns 放在组件外 —— 满足 no-unstable-nested-components 且列引用稳定。

import { useState } from "react";
import { Plus, Search, MoreHorizontal, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type Column } from "@/components/app/data-table";
import { PaginationBar } from "@/components/app/pagination-bar";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Field } from "@/components/app/field";

interface Project {
  id: string;
  name: string;
  code: string;
  status: "active" | "archived";
}

const DATA: Project[] = [
  { id: "1", name: "混凝土抗压强度试验", code: "PRJ-001", status: "active" },
  { id: "2", name: "钢筋焊接连接试验", code: "PRJ-002", status: "archived" },
];

// 列定义放模块作用域：一是满足 suite 的 no-unstable-nested-components 门，
// 二是列引用稳定，不随每次渲染重建。行内操作通过 handlers 注入。
function createColumns(handlers: {
  onEdit: (row: Project) => void;
  onDelete: (row: Project) => void;
}): Column<Project>[] {
  return [
    { header: "项目名称", cell: (r) => <span className="font-medium">{r.name}</span> },
    {
      header: "编号",
      cell: (r) => <span className="text-muted-foreground">{r.code}</span>,
    },
    {
      header: "状态",
      cell: (r) => (
        <Badge variant={r.status === "active" ? "default" : "secondary"}>
          {r.status === "active" ? "进行中" : "已归档"}
        </Badge>
      ),
    },
    {
      header: "",
      headClassName: "w-10",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handlers.onEdit(r)}>编辑</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(r)}>
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export default function App() {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const columns = createColumns({
    onEdit: () => setFormOpen(true),
    onDelete: (row) => setDeleteTarget(row),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <PageHeader
        title="项目管理"
        description="管理实验室的检测项目与归档"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            新增项目
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input placeholder="搜索项目名称 / 编号" className="pl-8" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={DATA}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={<FolderOpen />}
            title="还没有项目"
            description="点击右上角新增第一个检测项目"
            action={
              <Button onClick={() => setFormOpen(true)}>
                <Plus />
                新增项目
              </Button>
            }
          />
        }
      />

      <PaginationBar page={1} totalPages={3} total={2} onPageChange={() => {}} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="项目名称" required htmlFor="name">
              <Input id="name" placeholder="如：混凝土抗压强度试验" />
            </Field>
            <Field label="项目编号" required htmlFor="code" hint="全局唯一，创建后不可改">
              <Input id="code" placeholder="PRJ-003" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setFormOpen(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`删除「${deleteTarget?.name}」？`}
        description="此操作不可撤销。"
        destructive
        confirmText="删除"
        onConfirm={() => setDeleteTarget(null)}
      />

      <Toaster />
    </div>
  );
}
