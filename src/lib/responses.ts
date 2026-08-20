// 防御性列表响应归一器 —— 把后端可能返回的 3 种形状统一成 `{ items, total }`：
//
//  1) **裸数组** `T[]`        — msw handler 直返、SpringBoot 旧版裸 `List<X>`
//                                 （pre-TypeSpec Page<T> 之前），以及 raw fetch。
//  2) **完整 Page<T>**         — `{ items, page, pageSize, total }`（4 字段）：
//                                 shared TypeSpec `Page<T>` 当前契约；
//                                 SpringBoot 新版、nextjs wrapDict 输出。
//  3) **短 envelope**          — `{ items, total }`（2 字段）：junction GET
//                                 在 nextjs wrapLinks / msw installShapeAdapters
//                                 早期版本的输出。
//
// lab-react 当前依赖 `{items, total}` 形状读取主表（features/inspection-capability/
// InspectionCapabilityList.tsx）与 junction（ParameterStandardLinkDialog.tsx）。
// 该 adapter 让单一切换后端 / 切到裸 msw 时也不会出"200 但空表"。
//
// 不要把本模块塞进 `src/api/legacy-client.ts`（那是薄 axios + 路由常量）；
// 不要放在 `src/api/`（orval 生成的领地）；`src/lib/` 是放通用跨 features 工具的地方。

import type { AxiosResponse } from "axios";

export interface ListEnvelope<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

function isBareArray<T>(x: unknown): x is T[] {
  return Array.isArray(x);
}

function isEnvelope<T>(x: unknown): x is ListEnvelope<T> {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as { items?: unknown; total?: unknown };
  return Array.isArray(obj.items) && typeof obj.total === "number";
}

/**
 * 把任意 `{bare array | full Page<T> | short envelope}` 归一成 `{items, total}`。
 * 非数组也非 envelope 时返回空（避免 undefined 抛错）。
 */
export function normalizeListResponse<T>(raw: unknown): { items: T[]; total: number } {
  if (isBareArray<T>(raw)) {
    return { items: raw, total: raw.length };
  }
  if (isEnvelope<T>(raw)) {
    return { items: raw.items, total: raw.total };
  }
  return { items: [], total: 0 };
}

/** AxiosResponse 友好入口：传入 axios 返回的整个 response，直接拿归一后数据。 */
export function unwrapListResponse<T>(
  res: AxiosResponse<unknown>,
): { items: T[]; total: number } {
  return normalizeListResponse<T>(res.data);
}