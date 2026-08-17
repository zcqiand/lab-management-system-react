// 参数界面模型注册表（Batch 2B-7 满版 12 卡：default + 11 具体）。
//
// 镜像 nextjs REF src/features/data-entry/models/registry.ts：
// - resolveParamInterfaceModel(key) 命中 registry 取具体卡，未命中回退 DefaultParamCard
// - 算法域模块（cement-strength / rebar-mechanics / rebar-welding）+ StrengthCardBase +
//   resolveInterfaceByParam 来自 lab-management-system-shared/mocks/domain（nextjs 注释）
//   本仓家族 shared v0.2.0 已瘦身无 mocks/domain，本仓逐字拷实现到 models/ 下，registry 直接 import。

import type { ParamModelComponent } from "./types";
import { DefaultParamCard } from "./DefaultParamCard";
import { ConcreteCompressCard } from "./ConcreteCompressCard";
import { ConcretePermeabilityCard } from "./ConcretePermeabilityCard";
import { CementFlexuralCard } from "./CementFlexuralCard";
import { CementCompressCard } from "./CementCompressCard";
import { RebarWeldingTensileCard } from "./RebarWeldingTensileCard";
import { RebarWeldingBendCard } from "./RebarWeldingBendCard";
import { RebarMechNumericCard } from "./RebarMechNumericCard";
import { ParticleGradationCard } from "./ParticleGradationCard";
import { SoilCompactionCard } from "./SoilCompactionCard";
import { SoilCompactionDegreeCard } from "./SoilCompactionDegreeCard";

export const MODEL_REGISTRY: Record<string, ParamModelComponent> = {
  default: DefaultParamCard,
  "concrete-compress": ConcreteCompressCard,
  "concrete-permeability": ConcretePermeabilityCard,
  "cement-flexural": CementFlexuralCard,
  "cement-compress": CementCompressCard,
  "rebar-welding-tensile": RebarWeldingTensileCard,
  "rebar-welding-bend": RebarWeldingBendCard,
  "rebar-mech-numeric": RebarMechNumericCard,
  "particle-gradation": ParticleGradationCard as unknown as ParamModelComponent,
  "soil-compaction": SoilCompactionCard,
  "soil-compaction-degree": SoilCompactionDegreeCard,
};

export function resolveParamInterfaceModel(key?: string): ParamModelComponent {
  return (key && MODEL_REGISTRY[key]) || DefaultParamCard;
}