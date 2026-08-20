// 列表响应归一器的防御性 unit test —— 3 种输入形态（裸数组 / 完整 Page<T> /
// 短 envelope）必须都归一成 `{items, total}`，且对 malformed 输入不回抛。
import { describe, expect, it } from "vitest";
import type { AxiosResponse } from "axios";
import { normalizeListResponse, unwrapListResponse } from "@/lib/responses";

interface Row {
  code: string;
}

describe("normalizeListResponse", () => {
  it("归一裸数组：长度即 total", () => {
    const rows: Row[] = [{ code: "A" }, { code: "B" }, { code: "C" }];
    expect(normalizeListResponse<Row>(rows)).toEqual({
      items: rows,
      total: 3,
    });
  });

  it("归一完整 Page<T>（4 字段：items + page + pageSize + total）", () => {
    const wrapped = {
      items: [{ code: "X" }],
      page: 1,
      pageSize: 20,
      total: 42,
    };
    const out = normalizeListResponse<Row>(wrapped);
    expect(out.items).toEqual([{ code: "X" }]);
    expect(out.total).toBe(42);
  });

  it("归一短 envelope（2 字段：items + total，无 page/pageSize）", () => {
    const short = { items: [{ code: "Y" }, { code: "Z" }], total: 2 };
    const out = normalizeListResponse<Row>(short);
    expect(out).toEqual({ items: [{ code: "Y" }, { code: "Z" }], total: 2 });
  });

  it("malformed 输入 → 空 fallback，不抛错", () => {
    expect(normalizeListResponse<Row>(null)).toEqual({ items: [], total: 0 });
    expect(normalizeListResponse<Row>(undefined)).toEqual({ items: [], total: 0 });
    expect(normalizeListResponse<Row>({ items: "not-array" })).toEqual({
      items: [],
      total: 0,
    });
    expect(normalizeListResponse<Row>({ items: [], total: "NaN" })).toEqual({
      items: [],
      total: 0,
    });
  });

  it("unwrapListResponse 接受 axios-like response 并解 .data", () => {
    const fakeRes = {
      data: [{ code: "1" }, { code: "2" }],
    } as unknown as AxiosResponse<unknown>;
    expect(unwrapListResponse<Row>(fakeRes)).toEqual({
      items: [{ code: "1" }, { code: "2" }],
      total: 2,
    });
  });
});