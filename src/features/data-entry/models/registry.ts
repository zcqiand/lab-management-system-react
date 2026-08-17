// 参数界面模型注册表（Batch 2B-2 样本：1 个具体 + 1 个兜底）。
//
// 镜像 nextjs REF src/features/data-entry/models/registry.ts：
// - resolveParamInterfaceModel(key) 命中 registry 取具体卡，未命中回退 DefaultParamCard
// - 本批只注册 2 个 key：'cement-compress' + 'default'
// - 后续 batch 补 11 个具体卡（混凝土抗压/抗渗/水泥抗折/钢筋焊接拉伸/弯曲/钢筋力学数值/
//   颗粒级配/土工击实/土工击实度 + 1 个综合比值卡），从 shared 算法域模块下沉

import type { ParamModelComponent } from "./types";
import { DefaultParamCard } from "./DefaultParamCard";
import { CementCompressCard } from "./CementCompressCard";

export const MODEL_REGISTRY: Record<string, ParamModelComponent> = {
  default: DefaultParamCard,
  "cement-compress": CementCompressCard,
};

export function resolveParamInterfaceModel(key?: string): ParamModelComponent {
  return (key && MODEL_REGISTRY[key]) || DefaultParamCard;
}