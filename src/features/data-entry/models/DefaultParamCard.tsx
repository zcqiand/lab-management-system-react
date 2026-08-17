// M03.F03 通用参数卡（白名单之外的兜底）。
//
// 镜像 nextjs REF src/features/data-entry/models/DefaultParamCard.tsx（字段结构对齐）。
// 提供 4 个字段：检测依据（standards by parameter）/ 技术要求 / 检测结果 / 单项评定。

import type { ParamModelProps } from "./types";
import type { InspectionStandard } from "@/types/inspection/inspection-standard";
import type { InspectionTechnicalRequirement } from "@/types/inspection/inspection-technical-requirement";

const VERDICT_OPTIONS = ["合格", "不合格", "符合", "不符合"] as const;
type Verdict = (typeof VERDICT_OPTIONS)[number];

function requirementLabel(r: InspectionTechnicalRequirement): string {
  const unit = r.unit ? ` ${r.unit}` : "";
  if (
    (r.valueType === "range" || r.comparison === "range") &&
    r.minValue != null &&
    r.maxValue != null
  ) {
    return `${r.minValue} ~ ${r.maxValue}${unit}`;
  }
  if (r.comparison === "≥" && r.minValue != null) return `≥ ${r.minValue}${unit}`;
  if (r.comparison === "≤" && r.maxValue != null) return `≤ ${r.maxValue}${unit}`;
  if (r.targetValue)
    return `${r.comparison === "=" || r.comparison === "eq" ? "= " : ""}${r.targetValue}${unit}`;
  if (r.expression) return r.expression;
  const parts = [r.comparison, r.minValue ?? r.maxValue ?? r.targetValue]
    .filter(Boolean)
    .join(" ");
  return parts ? `${parts}${unit}` : r.remark || "—";
}

export function DefaultParamCard({
  parameter: p,
  record: rec,
  standards,
  stdParams,
  techReqs,
  onChange,
  readOnly = false,
}: ParamModelProps) {
  const basisOptions = stdParams
    .filter((sp) => sp.inspectionParameterCode === p.code)
    .map((sp) => standards.find((s) => s.code === sp.inspectionStandardCode))
    .filter((s): s is InspectionStandard => Boolean(s));
  const reqOptions = techReqs.filter((r) => r.inspectionParameterCode === p.code);
  const inputVal = rec?.result ?? "";
  const basisVal = rec?.standardCode ?? "";
  const reqVal = rec?.requirementCode ?? "";
  const verdictVal = rec?.verdict ?? "";

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {p.canonicalName || p.name}
          {p.unit ? `（${p.unit}）` : ""}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1 text-xs">
        <div>
          <label className="block text-slate-500 mb-0.5">检测依据</label>
          <select
            className="w-full border rounded px-1 py-1 text-sm bg-white"
            value={basisVal}
            onChange={(e) => onChange({ standardCode: e.target.value })}
            disabled={readOnly}
          >
            <option value="">—</option>
            {basisOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 mb-0.5">技术要求</label>
          <select
            className="w-full border rounded px-1 py-1 text-sm bg-white"
            value={reqVal}
            onChange={(e) => {
              const found = reqOptions.find((r) => r.id === e.target.value);
              onChange({
                requirementCode: e.target.value,
                requirement: found ? requirementLabel(found) : "",
              });
            }}
            disabled={readOnly}
          >
            <option value="">—</option>
            {reqOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {requirementLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 mb-0.5">检测结果</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={inputVal}
            onChange={(e) => onChange({ result: e.target.value })}
            placeholder="录入检测结果"
            readOnly={readOnly}
          />
        </div>
        <div>
          <label className="block text-slate-500 mb-0.5">单项评定</label>
          <select
            className="w-full border rounded px-1 py-1 text-sm bg-white"
            value={verdictVal}
            onChange={(e) => onChange({ verdict: e.target.value as Verdict })}
            disabled={readOnly}
          >
            <option value="">未评定</option>
            {VERDICT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default DefaultParamCard;