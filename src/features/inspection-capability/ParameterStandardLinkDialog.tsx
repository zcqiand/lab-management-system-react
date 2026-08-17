// ParameterStandardLinkDialog — M06.F03.I02（参数↔标准关联）。
//
// parameters 列表行内「关联标准」按钮的弹窗：列出全部检测标准（含状态），
// toggle 该参数的关联（POST/DELETE /api/inspection/links/standard-parameter）。
// 已关联集合从 msw GET links/standard-parameter 全量拉回后按
// inspectionParameterCode 过滤（契约 GET 只有 standardCode 过滤，客户端补）。

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient, API_ROUTES } from "@/api/legacy-client";
import type { InspectionStandard } from "@/types/inspection";

const STANDARD_STATUS_CN: Record<string, string> = {
  active: "现行",
  superseded: "被替代",
  draft: "草案",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前参数的 code */
  parameterCode: string;
  /** 参数显示名（弹窗标题用） */
  parameterName: string;
  /** 关联变化后回调（列表刷新 standardCodes 聚合列） */
  onChanged: () => void;
}

export function ParameterStandardLinkDialog({
  open,
  onOpenChange,
  parameterCode,
  parameterName,
  onChanged,
}: Props) {
  const [standards, setStandards] = useState<InspectionStandard[]>([]);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // 标准全量（无分页上限的 keyword 空查询）+ 关联全量（客户端过滤）
      const [stdResp, linkResp] = await Promise.all([
        apiClient.get<{ items: InspectionStandard[] }>(API_ROUTES["/inspection-standards"], {
          params: { page: 1, pageSize: 500 },
        }),
        apiClient.get<
          Array<{ inspectionStandardCode: string; inspectionParameterCode: string }>
        >(API_ROUTES["/inspection-standard-parameters"]),
      ]);
      const linkList = Array.isArray(linkResp.data)
        ? linkResp.data
        : ((linkResp.data as unknown as { items: typeof linkResp.data })?.items ?? []);
      setStandards(stdResp.data.items ?? []);
      setLinked(
        new Set(
          linkList
            .filter((l) => l.inspectionParameterCode === parameterCode)
            .map((l) => l.inspectionStandardCode),
        ),
      );
    } catch (err) {
      toast.error(`加载关联失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parameterCode]);

  const toggle = async (stdCode: string) => {
    setBusyCode(stdCode);
    try {
      if (linked.has(stdCode)) {
        await apiClient.delete(API_ROUTES["/inspection-standard-parameters"], {
          data: {
            inspectionStandardCode: stdCode,
            inspectionParameterCode: parameterCode,
          },
        });
        setLinked((prev) => {
          const next = new Set(prev);
          next.delete(stdCode);
          return next;
        });
        toast.success(`已解除关联 ${stdCode}`);
      } else {
        await apiClient.post(API_ROUTES["/inspection-standard-parameters"], {
          inspectionStandardCode: stdCode,
          inspectionParameterCode: parameterCode,
        });
        setLinked((prev) => new Set(prev).add(stdCode));
        toast.success(`已关联 ${stdCode}`);
      }
      onChanged();
    } catch (err) {
      toast.error(`关联操作失败：${(err as Error).message}`);
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>关联标准 — {parameterName}</DialogTitle>
          <DialogDescription>
            参数编码 {parameterCode}；已关联 {linked.size} 项（toggle 即时保存）
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">加载中…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标准编码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standards.map((s) => (
                <TableRow key={s.code}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="text-sm">{s.name ?? "-"}</TableCell>
                  <TableCell className="text-xs">{s.version ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "outline"}>
                      {STANDARD_STATUS_CN[s.status ?? ""] ?? s.status ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={linked.has(s.code) ? "outline" : "default"}
                      size="sm"
                      disabled={busyCode === s.code}
                      onClick={() => void toggle(s.code)}
                      data-fn="M06.F03.I02"
                      aria-label={`${linked.has(s.code) ? "解除关联" : "关联"} ${s.code}`}
                    >
                      {linked.has(s.code) ? "解除关联" : "关联"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
