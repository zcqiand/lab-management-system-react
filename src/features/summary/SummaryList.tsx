// M05.F01 报告汇总 + 仪表盘统计 — 列表页（Sprint 2 Batch 2B-5）。
//
// 镜像 nextjs 仓的 SummaryList（如果有）—— react 仓独立写。
// 数据：
//   - GET /api/summary       报告汇总表（按 categoryCode 过滤）
//   - GET /api/summary/stats 仪表盘统计（合同/接样/样品/按状态报告数/待办任务）
//
// 适配层：msw handlers-extra.ts summaryExtraHandlers 已直接返回 REF 期望形状
// （{summaryName, columns, rows} 与 {contractCount, ...reportCountByStatus}），
// 无需 installShapeAdapters 额外兜底。
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/app/empty-state";
import { apiClient, API_ROUTES } from "@/api/legacy-client";

interface SummaryColumn {
  key: string;
  label: string;
}

interface SummaryData {
  summaryName: string;
  columns: SummaryColumn[];
  rows: Array<Record<string, string>>;
}

interface DashboardStats {
  contractCount: number;
  receiptCount: number;
  sampleCount: number;
  reportCountByStatus: {
    draft: number;
    reviewing: number;
    issued: number;
  };
  pendingTaskCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  receiving: "接样",
  task_assignment: "任务分配",
  data_entry: "数据录入",
  review: "审核",
  approval: "批准",
  issuance: "发放",
  archived: "归档",
  completed: "已完成",
};

// @entry M05.F01.I01
// @entry M05.F01.I02
export function SummaryList() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (categoryCode && categoryCode !== "ALL") params.categoryCode = categoryCode;
    Promise.all([
      apiClient
        .get<SummaryData>(API_ROUTES["/summary"], { params })
        .then((res) => setData(res.data ?? null))
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "汇总加载失败");
        }),
      apiClient
        .get<DashboardStats>(`${API_ROUTES["/summary"]}/stats`)
        .then((res) => setStats(res.data ?? null))
        .catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, [categoryCode]);

  return (
    <div className="space-y-4" data-fn="M05.F01.I01">
      <Card>
        <CardHeader>
          <CardTitle>报告汇总</CardTitle>
          <CardDescription>
            M05.F01 报告汇总表（按报告类别 categoryCode 过滤）——数据来自 lab-msw fixtures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor="categoryCode">报告类别</Label>
              <Select value={categoryCode} onValueChange={setCategoryCode}>
                <SelectTrigger id="categoryCode" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部</SelectItem>
                  <SelectItem value="RC">建材检测（RC）</SelectItem>
                  <SelectItem value="ST">主体结构（ST）</SelectItem>
                  <SelectItem value="MT">钢结构（MT）</SelectItem>
                  <SelectItem value="AD">建筑节能（AD）</SelectItem>
                  <SelectItem value="ID">室内环境（ID）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {!loading && data && data.rows.length === 0 ? (
            <EmptyState title="暂无报告" description="该类别下还没有接样单" />
          ) : data && data.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {data.columns.map((c) => (
                      <TableCell key={c.key}>
                        {c.key === "flowStatus" ? (
                          <Badge variant="outline">{(STATUS_LABEL[String(row[c.key] ?? "")] ?? (String(row[c.key] ?? "") || "-"))}</Badge>
                        ) : c.key === "result" ? (
                          row[c.key] === "qualified" ? (
                            <Badge>合格</Badge>
                          ) : row[c.key] === "unqualified" ? (
                            <Badge variant="destructive">不合格</Badge>
                          ) : (
                            "-"
                          )
                        ) : (
                          String(row[c.key] ?? "-")
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          <div className="text-sm text-muted-foreground">
            {data ? `共 ${data.rows.length} 条 — ${data.summaryName}` : ""}
          </div>
        </CardContent>
      </Card>

      {/* @entry M05.F01.I02 仪表盘统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-fn="M05.F01.I02">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>合同数</CardDescription>
            <CardTitle className="text-3xl">{stats?.contractCount ?? "-"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>接样数</CardDescription>
            <CardTitle className="text-3xl">{stats?.receiptCount ?? "-"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>样品数</CardDescription>
            <CardTitle className="text-3xl">{stats?.sampleCount ?? "-"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待办任务</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{stats?.pendingTaskCount ?? "-"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>按状态分布</CardDescription>
            <div className="text-sm space-y-1 pt-1">
              <div>草稿：{stats?.reportCountByStatus.draft ?? 0}</div>
              <div>审核中：{stats?.reportCountByStatus.reviewing ?? 0}</div>
              <div>已发：{stats?.reportCountByStatus.issued ?? 0}</div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default SummaryList;
