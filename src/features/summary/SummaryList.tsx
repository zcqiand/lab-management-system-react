// M05.F01 报告汇总 + 仪表盘统计 — 列表页（Sprint 2 Batch 2B-5；REQ-2026-017 补 I03/I04）。
//
// 数据：
//   - GET /api/summary       报告汇总表（按 categoryCode 过滤）
//   - GET /api/summary/stats 仪表盘统计（基础 4 计数 + 按状态报告数/待办 +
//                            I03 核心指标 todayTestCount/reportOutputByStatus/
//                            qualifiedRateByMaterial + I04 漏斗 funnelByStage）
//
// REQ-2026-017：I03 核心指标卡 + I04 任务状态漏斗镜像 nextjs SummaryPage
// 同名已上线区块（testid 逐字对齐），UI 顺序 统计卡(I02)→核心指标(I03)→漏斗(I04)。
import { useEffect, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PageLoading } from "@/components/app/page-loading";
import {
  summaryGetDashboardStats,
  summaryGetReportSummary,
} from "@/api/endpoints/summary/summary";
import type { SummaryData } from "@/api/endpoints/model/summaryData";
import type { DashboardStats } from "@/api/endpoints/model/dashboardStats";

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

// REQ-2026-017 I03/I04：与 nextjs SummaryPage 同款常量（key 顺序即漏斗段序）
const FUNNEL_LABELS: Array<{
  key: keyof DashboardStats["funnelByStage"];
  label: string;
}> = [
  { key: "pending_collect", label: "待取样" },
  { key: "received", label: "已收样" },
  { key: "testing", label: "试验中" },
  { key: "reporting", label: "报告编制" },
  { key: "reviewing", label: "待审核" },
  { key: "issued", label: "已签发" },
];

const MATERIAL_LABELS: Array<{
  key: keyof DashboardStats["qualifiedRateByMaterial"];
  label: string;
}> = [
  { key: "concrete", label: "混凝土" },
  { key: "rebar", label: "钢筋" },
  { key: "sand", label: "砂石" },
];

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// @entry M05.F01.I01
// @entry M05.F01.I02
// @entry M05.F01.I03 — 核心指标卡（REQ-2026-017，镜像 nextjs SummaryPage）
// @entry M05.F01.I04 — 任务状态漏斗（REQ-2026-017，镜像 nextjs SummaryPage）
// @entry M05.F01.I06 — 仪表盘统计基础端点 （ADR-0033 阶段二自后端仓 M05.F02.I01 改挂 F01）
export function SummaryList() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const categoryParam =
      categoryCode && categoryCode !== "ALL" ? categoryCode : undefined;
    Promise.all([
      summaryGetReportSummary({ categoryCode: categoryParam })
        .then((res) => setData(res.data ?? null))
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "汇总加载失败");
        }),
      summaryGetDashboardStats()
        .then((res) => setStats(res.data ?? null))
        .catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, [categoryCode]);

  // B6 加载态：聚合 flag —— 汇总表 + 统计两个源任一未到且首载未出错时整页加载
  if (loading && !data && !error) return <PageLoading />;

  return (
    <div className="space-y-4" data-fn="M05.F01.I01">
      <Card>
        <CardHeader>
          <CardTitle>报告汇总</CardTitle>
          <CardDescription>
            M05.F01 报告汇总表（按报告类别 categoryCode 过滤）
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
                          <Badge variant="outline">
                            {STATUS_LABEL[String(row[c.key] ?? "")] ??
                              (String(row[c.key] ?? "") || "-")}
                          </Badge>
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
            <CardTitle className="text-3xl text-amber-600">
              {stats?.pendingTaskCount ?? "-"}
            </CardTitle>
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

      {/* —— @entry M05.F01.I03 核心指标卡（REQ-2026-017，镜像 nextjs SummaryPage）—— */}
      <section
        data-fn="M05.F01.I03"
        data-testid="dashboard-metrics"
        className="space-y-3"
      >
        <h2 className="text-base font-semibold">核心指标</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            testid="metric-today-tests"
            label="今日试验总数"
            value={stats?.todayTestCount ?? "—"}
            unit="项"
          />
          <MetricCard
            testid="metric-output"
            label="报告产出量"
            customValue={
              stats ? (
                <div className="text-sm space-y-1" data-testid="metric-output-detail">
                  <div>
                    已生成：<b>{stats.reportOutputByStatus.generated}</b>
                  </div>
                  <div>
                    待审核：<b>{stats.reportOutputByStatus.pending}</b>
                  </div>
                  <div>
                    已签发：<b>{stats.reportOutputByStatus.issued}</b>
                  </div>
                </div>
              ) : (
                "—"
              )
            }
          />
          <MetricCard
            testid="metric-qualified-rate"
            label="检测合格率"
            customValue={
              stats ? (
                <ul className="text-sm space-y-1" data-testid="metric-qualified-detail">
                  {MATERIAL_LABELS.map((m) => {
                    const e = stats.qualifiedRateByMaterial[m.key];
                    return (
                      <li key={m.key}>
                        {m.label}：<b>{pct(e.rate)}</b>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({e.pass}/{e.total})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                "—"
              )
            }
          />
        </div>
      </section>

      {/* —— @entry M05.F01.I04 任务状态漏斗（REQ-2026-017，镜像 nextjs SummaryPage）—— */}
      <section data-fn="M05.F01.I04" data-testid="dashboard-funnel" className="space-y-3">
        <h2 className="text-base font-semibold">试验任务状态</h2>
        {stats ? (
          <FunnelChart counts={stats.funnelByStage} />
        ) : (
          <div className="text-sm text-muted-foreground">载入中…</div>
        )}
      </section>
    </div>
  );
}

// ——— MetricCard 子组件（REQ-2026-017 I03，testid 与 nextjs 同名）———
function MetricCard({
  label,
  value,
  unit,
  customValue,
  testid,
}: {
  label: string;
  value?: string | number;
  unit?: string;
  customValue?: ReactNode;
  testid: string;
}) {
  return (
    <Card data-testid={testid}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <div className="pt-1">
          {customValue ?? (
            <span className="text-2xl font-semibold tabular-nums">
              {value}
              {unit ? (
                <span className="text-sm text-muted-foreground ml-1">{unit}</span>
              ) : null}
            </span>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

// ——— FunnelChart 子组件（REQ-2026-017 I04，水平条形 + 段计数 + 合计）———
function FunnelChart({ counts }: { counts: DashboardStats["funnelByStage"] }) {
  const total = FUNNEL_LABELS.reduce((acc, s) => acc + counts[s.key], 0);
  if (total === 0) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground" data-testid="funnel-empty">
          当前无任务
        </CardContent>
      </Card>
    );
  }
  // 漏斗视觉：按段比例画水平条，宽度逐段递减（与 nextjs 同款）
  const stageCount = FUNNEL_LABELS.length;
  return (
    <Card>
      <CardContent className="space-y-2" data-testid="funnel-bars">
        {FUNNEL_LABELS.map((s, i) => {
          const count = counts[s.key];
          // 漏斗宽度：从 100% 线性递减到 50%（视觉漏斗感）
          const widthPct = 100 - (i * 50) / (stageCount - 1);
          const ratio = count / total;
          return (
            <div
              key={s.key}
              data-testid={`funnel-stage-${s.key}`}
              className="flex items-center gap-3"
            >
              <div className="w-20 text-xs text-muted-foreground shrink-0">{s.label}</div>
              <div className="flex-1 h-7 bg-muted rounded relative overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(ratio * widthPct).toFixed(2)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs tabular-nums">
                  {count} 项
                </div>
              </div>
            </div>
          );
        })}
        <div className="text-xs text-muted-foreground pt-1">合计 {total} 项</div>
      </CardContent>
    </Card>
  );
}

export default SummaryList;
