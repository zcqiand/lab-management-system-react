// 参数界面模型卡片的统一契约。
//
// 镜像 nextjs REF src/features/data-entry/models/types.ts（简化版，去掉跨记录联立入参）。
// Batch 2B-2 落 2 卡：DefaultParamCard（通用兜底）+ CementCompressCard（水泥抗压示例）。

import type { ReactElement } from "react";
import type { InspectionParameter } from "@/types/inspection/inspection-parameter";
import type { TestRecord } from "@/types/process/test-record";
import type { InspectionStandard } from "@/types/inspection/inspection-standard";
import type { InspectionStandardParameter } from "@/types/inspection/inspection-standard-parameter";
import type { InspectionTechnicalRequirement } from "@/types/inspection/inspection-technical-requirement";

/** 所有参数界面模型组件的统一契约。组件只渲染 + 上报改动，不直接 fetch / 不落库。 */
export interface ParamModelProps {
  parameter: InspectionParameter;
  record: TestRecord | undefined;
  sampleId: string;
  standards: InspectionStandard[];
  stdParams: InspectionStandardParameter[];
  techReqs: InspectionTechnicalRequirement[];
  config: Record<string, unknown> | undefined;
  /** 把改动上报给父组件（EntryModal）合并入 dirty 缓冲，由保存按钮统一落库。 */
  onChange: (patch: Partial<TestRecord>) => void;
  /** 只读模式（详情页「检测数据」用）：所有输入/select 灰化 + onChange 被吞掉。 */
  readOnly?: boolean;
}

export type ParamModelComponent = (props: ParamModelProps) => ReactElement;