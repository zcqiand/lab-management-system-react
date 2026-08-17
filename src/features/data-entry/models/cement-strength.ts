// 水泥胶砂抗压强度算法（简化版）。
//
// 镜像 nextjs REF src/features/data-entry/models/cement-strength.ts computeCementCompress 逻辑。
// 6 试件破坏荷载(kN) → 抗压强度(MPa, Rc = F / A) → 平均值 → 单项评定占位（< ±10% 偏差）。
// 完整版（带 ±10% 剔除均值）放到下批，本批只保留算法骨架。

export interface StrengthResult {
  /** 抗压强度 MPa 列表（与输入等长） */
  strengths: number[];
  /** 平均值 MPa */
  average: number;
}

/** 把 kN 力转换为 MPa 强度：Rc = F(kN) * 1000 / A(mm²) = F * 1000 / 1600 = F * 0.625。 */
export function computeCementCompress(loads: number[], areaMm2 = 1600): StrengthResult {
  const strengths = loads.map((f) => (f * 1000) / areaMm2);
  const average =
    strengths.length > 0
      ? strengths.reduce((a, b) => a + b, 0) / strengths.length
      : 0;
  return { strengths, average };
}