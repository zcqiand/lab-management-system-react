// 水泥胶砂抗压强度卡（水泥 M03.F03 首个具体卡片样本）。
//
// 镜像 nextjs REF src/features/data-entry/models/CementCompressCard.tsx 简化版：
// - 6 试件破坏荷载 (kN) 输入 → 抗压强度 (MPa, Rc=F/A, A=1600mm²) → 平均值 → 单项评定
// - 本批不带 ±10% 剔除均值（完整版下批补齐，shared 算法域模块随之下沉）
//
// React L5 锚点：data-fn 在卡片根 div（共享 I-level）

import { useMemo } from "react";
import type { ParamModelProps } from "./types";
import { computeCementCompress } from "./cement-strength";

export function CementCompressCard(props: ParamModelProps) {
  const { parameter: p, record: rec, onChange, readOnly = false } = props;
  const specimenCount = 6; // 默认 6 试件
  const area = (props.config?.["area"] as number) ?? 1600;

  // 把 record.result 解析为 6 个荷载值（用逗号或换行分隔）
  const loads = useMemo(() => {
    if (!rec?.result) return new Array<number>(specimenCount).fill(0);
    const parts = rec.result.split(/[,;\n]+/).map((s) => parseFloat(s.trim()));
    const out = new Array<number>(specimenCount).fill(0);
    for (let i = 0; i < specimenCount && i < parts.length; i++) {
      out[i] = Number.isFinite(parts[i]) ? (parts[i] as number) : 0;
    }
    return out;
  }, [rec?.result, specimenCount]);

  const result = useMemo(() => computeCementCompress(loads, area), [loads, area]);

  function updateLoad(i: number, v: string) {
    const num = parseFloat(v);
    const next = [...loads];
    next[i] = Number.isFinite(num) ? num : 0;
    onChange({ result: next.join(",") });
  }

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {p.canonicalName || p.name}（{p.unit ?? "MPa"}）
        </span>
        <span className="text-xs text-slate-500">
          平均：{result.average.toFixed(2)} MPa
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {loads.map((load, i) => (
          <div key={i}>
            <label className="block text-xs text-slate-500 mb-0.5">
              试件 {i + 1}
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-1 py-1 text-sm"
              value={load || ""}
              onChange={(e) => updateLoad(i, e.target.value)}
              placeholder="kN"
              readOnly={readOnly}
            />
            <div className="text-xs text-slate-400 text-center mt-0.5">
              {result.strengths[i] ? result.strengths[i]!.toFixed(2) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CementCompressCard;