// ReportNameLinkDialog — M06.F07.I02（报告名称↔标准/参数关联）。
//
// 报告名称列表行内「关联」按钮的弹窗：两段列表（标准 / 参数），
// toggle 关联（POST/DELETE /api/report-names/links/{standard,parameter}）。
// 标准关联带 role（TESTING 检测 / JUDGMENT 判定）。
// 已关联集合从 msw GET links（reportNameCode 过滤）拉回。

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import type { InspectionStandard } from "@/types/inspection";
import type { InspectionParameter } from "@/types/inspection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportNameCode: string;
  reportNameLabel: string;
  onChanged: () => void;
}

interface StdLink {
  reportNameCode: string;
  inspectionStandardCode: string;
  role: "TESTING" | "JUDGMENT";
}

interface ParamLink {
  reportNameCode: string;
  inspectionParameterCode: string;
}

export function ReportNameLinkDialog({
  open,
  onOpenChange,
  reportNameCode,
  reportNameLabel,
  onChanged,
}: Props) {
  const [standards, setStandards] = useState<InspectionStandard[]>([]);
  const [parameters, setParameters] = useState<InspectionParameter[]>([]);
  const [stdLinks, setStdLinks] = useState<StdLink[]>([]);
  const [paramLinks, setParamLinks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [stdResp, paramResp, stdLinkResp, paramLinkResp] = await Promise.all([
        apiClient.get<{ items: InspectionStandard[] }>(API_ROUTES["/inspection-standards"], {
          params: { page: 1, pageSize: 500 },
        }),
        apiClient.get<{ items: InspectionParameter[] }>(API_ROUTES["/inspection-parameters"], {
          params: { page: 1, pageSize: 500 },
        }),
        apiClient.get<StdLink[]>(API_ROUTES["/inspection-report-name-standards"], {
          params: { reportNameCode },
        }),
        apiClient.get<ParamLink[]>(API_ROUTES["/inspection-report-name-parameters"], {
          params: { reportNameCode },
        }),
      ]);
      setStandards(stdResp.data.items ?? []);
      setParameters(paramResp.data.items ?? []);
      setStdLinks(Array.isArray(stdLinkResp.data) ? stdLinkResp.data : []);
      const pl = Array.isArray(paramLinkResp.data)
        ? paramLinkResp.data
        : ((paramLinkResp.data as unknown as { items: ParamLink[] })?.items ?? []);
      setParamLinks(new Set(pl.map((l) => l.inspectionParameterCode)));
    } catch (err) {
      toast.error(`加载关联失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportNameCode]);

  const toggleStd = async (stdCode: string) => {
    // role 简化为 TESTING（检测依据）；判定标准关联由后续 batch 细化
    const existing = stdLinks.find(
      (l) => l.inspectionStandardCode === stdCode && l.role === "TESTING",
    );
    setBusy(stdCode);
    try {
      if (existing) {
        await apiClient.delete(API_ROUTES["/inspection-report-name-standards"], {
          data: { reportNameCode, inspectionStandardCode: stdCode, role: "TESTING" },
        });
        setStdLinks((prev) =>
          prev.filter(
            (l) => !(l.inspectionStandardCode === stdCode && l.role === "TESTING"),
          ),
        );
        toast.success(`已解除标准 ${stdCode}`);
      } else {
        await apiClient.post(API_ROUTES["/inspection-report-name-standards"], {
          reportNameCode,
          inspectionStandardCode: stdCode,
          role: "TESTING",
        });
        setStdLinks((prev) => [
          ...prev,
          { reportNameCode, inspectionStandardCode: stdCode, role: "TESTING" },
        ]);
        toast.success(`已关联标准 ${stdCode}`);
      }
      onChanged();
    } catch (err) {
      toast.error(`标准关联失败：${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const toggleParam = async (paramCode: string) => {
    setBusy(paramCode);
    try {
      if (paramLinks.has(paramCode)) {
        await apiClient.delete(API_ROUTES["/inspection-report-name-parameters"], {
          data: { reportNameCode, inspectionParameterCode: paramCode },
        });
        setParamLinks((prev) => {
          const next = new Set(prev);
          next.delete(paramCode);
          return next;
        });
        toast.success(`已解除参数 ${paramCode}`);
      } else {
        await apiClient.post(API_ROUTES["/inspection-report-name-parameters"], {
          reportNameCode,
          inspectionParameterCode: paramCode,
        });
        setParamLinks((prev) => new Set(prev).add(paramCode));
        toast.success(`已关联参数 ${paramCode}`);
      }
      onChanged();
    } catch (err) {
      toast.error(`参数关联失败：${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>关联维护 — {reportNameLabel}</DialogTitle>
          <DialogDescription>
            报告名称 {reportNameCode}；标准 {stdLinks.length} 项 / 参数 {paramLinks.size} 项
            （toggle 即时保存）
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">加载中…</p>
        ) : (
          <div className="space-y-4">
            <section>
              <h4 className="text-sm font-semibold mb-2">检测标准（role=检测）</h4>
              <div className="grid gap-1">
                {standards.map((s) => {
                  const on = stdLinks.some(
                    (l) => l.inspectionStandardCode === s.code && l.role === "TESTING",
                  );
                  return (
                    <div
                      key={s.code}
                      className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50"
                    >
                      <span className="text-sm">
                        <span className="font-mono text-xs">{s.code}</span> {s.name}
                        {s.status === "active" ? (
                          <Badge className="ml-2" variant="default">
                            现行
                          </Badge>
                        ) : null}
                      </span>
                      <Button
                        variant={on ? "outline" : "default"}
                        size="sm"
                        disabled={busy === s.code}
                        onClick={() => void toggleStd(s.code)}
                        data-fn="M06.F07.I02"
                        aria-label={`${on ? "解除标准" : "关联标准"} ${s.code}`}
                      >
                        {on ? "解除" : "关联"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
            <section>
              <h4 className="text-sm font-semibold mb-2">检测参数</h4>
              <div className="grid gap-1">
                {parameters.map((p) => {
                  const on = paramLinks.has(p.code);
                  return (
                    <div
                      key={p.code}
                      className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50"
                    >
                      <span className="text-sm">
                        <span className="font-mono text-xs">{p.code}</span> {p.name}
                        {p.unit ? (
                          <span className="text-xs text-slate-500 ml-1">({p.unit})</span>
                        ) : null}
                      </span>
                      <Button
                        variant={on ? "outline" : "default"}
                        size="sm"
                        disabled={busy === p.code}
                        onClick={() => void toggleParam(p.code)}
                        data-fn="M06.F07.I02"
                        aria-label={`${on ? "解除参数" : "关联参数"} ${p.code}`}
                      >
                        {on ? "解除" : "关联"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
