// tests/helpers/seed.ts —— Task 8（不 commit；Task 9/10 复核后随各自任务收编）
//
// lab-msw（@lab/management-system-msw）与 REF 组件期望的响应形状有两类缺口：
//   1. dictCrud / 链接 GET 返回**裸数组**，REF 组件（axios `.data.items`）期望 `{items:[]}`；
//   2. `/samples` 无 keyword 过滤、`/receipts` 无 categoryCode / lastSubmittedBy 过滤、
//      `/test-records` 无 receiptId 过滤（REF 语义有）。
//
// 本文件提供两层适配（数据仍来自同一内存 fixtures，不是编造 mock）：
//   - `installShapeAdapters(server)`：server.use 高优先级 handler，把上述端点包成
//     REF 形状 `{items,total}` + 补 REF 过滤语义。注意 setup.dom.ts 的 afterEach 会
//     resetHandlers() 清掉 use() 覆盖，所以必须在每个测试文件的 beforeEach 里重装。
//   - `tablesOf()`：把 lab-msw fixtures 的可变数组包成 REF 测试用的 `xxxTable`
//     单例视图（insert/all/findById/reset）。
//
// reset 策略：模块加载时对 fixtures 数组做 structuredClone 快照；`resetFixtures()`
// 用 length=0 + push 恢复（数组引用不变——msw handler 闭包捕获的就是这些引用）。
// 插入行需带 tenantId:'TENANT-001'（msw handler byTenant 过滤，缺 tenantId 的行不可见）。
//
// ———— Task 10 扩展（data-entry 移植收尾）————
// REF tests/helpers/seed.ts 的 seedParamInterfaces / seedData / orgInfoTable 是
// shared MockServer 架构；本仓是 lab-msw fixtures 数组架构。以下扩展按本仓模式
// 提供等价能力（移植自 REF tests/helpers/seed.ts，id/数据逐一保留）：
//   - `seedParamInterfaces(server?)`：把 inspection-param-interfaces / inspection-param-interface-links
//     两张 fixtures 清空并按 generated JSON 重灌（id 形态 `pi-${code}` 与 REF 一致）。
//     msw seed 本就含这两张表，但测试调它取「干净确定性」语义——保留 no-op 不行，
//     因为 REF 语义是 replaceAll 后重灌。参数仅为兼容 REF 调用签名，值被忽略。
//   - `seedData(server?)`：REF 的 10 合同 × 30 RN 接样单大种子（含 JSON 形状
//     test-records）——lab-msw seed 只有 6 接样单 3 类别，覆盖不了报告链路回归。
//     本仓版本向 fixtures 数组直接灌（带 tenantId，绕过 byTenant 不可见问题），
//     runtime 4 表（receipts/samples/test-records/contracts）replaceAll 语义 =
//     length=0 + 重灌。orgInfo 行灌入独立的 orgInfos 内存表（msw 无此端点）。
//   - `orgInfoTable`：REF 兼容的 org 单例表视图（tablesOf() 返回值新增）。
import { http, HttpResponse } from "msw";
import {
  sampleReceipts,
  samples,
  testRecords,
  inspectionReportNames,
  inspectionParameters,
  inspectionStandards,
  inspectionStandardParameters,
  inspectionReportNameStandards,
  inspectionReportNameParameters,
  inspectionParamInterfaces,
  inspectionParamInterfaceLinks,
  contracts,
  inspectionSpecialties,
  inspectionObjects,
  inspectionObjectStandards,
  inspectionObjectParameters,
  inspectionSpecialtyObjects,
  inspectionObjectReportNames,
  inspectionCalculationRules,
  technicalRequirements,
} from "@lab/management-system-msw/fixtures";
import paramInterfacesJson from "@/data/generated/inspection-param-interface.json";
import paramInterfaceLinksJson from "@/data/generated/inspection-parameter-param-interface.json";
// (reportNameParametersJson 随 Batch 4 seedData 回填)

// ————————————————————————————————————————————————
// fixtures 快照 / 恢复
// ——————————————————————————————————————————————

const SNAPSHOTTED: Array<{ arr: unknown[]; snapshot: unknown[] }> = [
  sampleReceipts, samples, testRecords, inspectionReportNames, inspectionParameters,
  inspectionStandards, inspectionStandardParameters, inspectionReportNameStandards,
  inspectionReportNameParameters, inspectionParamInterfaces, inspectionParamInterfaceLinks, contracts,
  inspectionSpecialties, inspectionObjects, inspectionObjectStandards,
  inspectionObjectParameters, inspectionSpecialtyObjects, inspectionObjectReportNames,
  inspectionCalculationRules, technicalRequirements,
].map((arr) => ({ arr: arr as unknown[], snapshot: structuredClone(arr) }));

/** 把 fixtures 恢复到模块加载时的快照（引用不变，内容重置）。 */
export function resetFixtures(): void {
  for (const { arr, snapshot } of SNAPSHOTTED) {
    arr.length = 0;
    arr.push(...snapshot);
  }
  orgInfos.length = 0;
}

// ————————————————————————————————————————————————
// 形状适配层（server.use 优先级最高；每个 beforeEach 重装）
// ——————————————————————————————————————————————

const TENANT = "TENANT-001";

function pageOf<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

function num(v: string | null, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

// ———— Task 13：M06 主表 / junction 适配 helper（dictCrud 裸数组 → REF 形状）————

/** M06 主表：补 id=code（REF 组件 rowId 读 id 列；msw dictCrud 以 code 为主键），
 * 支持 keyword（code/name includes）+ REF 过滤参数语义：
 *  - 有同名列的行直接按列过滤（objects.inspectionSpecialtyCode）；
 *  - 无同名列的（standards/parameters 按专项/项目/标准过滤）经 junction 表反查——
 *    REF 语义：standards?inspectionObjectCode=… 经 inspection-object-standards，
 *    standards?inspectionSpecialtyCode=… 经 specialty-object + object-standard 两跳，
 *    parameters 同理（object → object-parameter / standard-parameter）。 */
function wrapDict(
  rows: Array<Record<string, unknown>>,
  request: Request,
  junctions?: {
    /** 本表自身的 code 列名 */
    selfCodeKey?: string;
    /** 过滤参数 → 反查路径（junction 数组 + 两端列名；可两跳） */
    reverse?: Record<string, Array<{ link: Array<Record<string, unknown>>; from: string; to: string }>>;
    /** 聚合列（老 shared lab-handlers 语义，backup/lab-management-system-shared
     * mocks/runtime/handlers/lab-handlers.ts）：本行 code 经 junction 关联的对端
     * code（names 给了则映射成名称，查不到回退 code）去重后以全角逗号 join。
     * names Map 在 handler 闭包里现算，保证测试中新增行也拿到新名。 */
    aggregate?: Array<{
      as: string;
      link: Array<Record<string, unknown>>;
      selfCol: string;
      otherCol: string;
      names?: Map<string, string>;
    }>;
  },
) {
  const selfCodeKey = junctions?.selfCodeKey ?? "code";
  const url = new URL(request.url);
  const withId: Array<Record<string, unknown>> = rows.map((r) => ({
    ...r,
    id: String(r["id"] ?? r[selfCodeKey]),
  }));
  let items = withId;
  const kw = url.searchParams.get("keyword") ?? "";
  if (kw)
    items = items.filter(
      (r) => String(r["code"] ?? "").includes(kw) || String(r["name"] ?? "").includes(kw),
    );
  for (const key of [
    "inspectionSpecialtyCode",
    "inspectionObjectCode",
    "inspectionStandardCode",
    "inspectionParameterCode",
  ]) {
    const v = url.searchParams.get(key);
    if (!v) continue;
    if (items.length > 0 && key in (items[0] as Record<string, unknown>)) {
      // 主表自带该列（objects.inspectionSpecialtyCode）→ 直接过滤
      items = items.filter((r) => r[key] === v);
    } else if (junctions?.reverse?.[key]) {
      // 经 junction 反查：沿 from→to 逐跳收集允许的 code 集合
      let allowed: Set<string> | null = null;
      for (const hop of junctions.reverse[key]) {
        const next = new Set(
          hop.link
            .filter((l) => allowed === null || allowed.has(String(l[hop.from] ?? "")))
            .map((l) => String(l[hop.to] ?? ""))
            .filter(Boolean),
        );
        allowed = next;
      }
      items = allowed ? items.filter((r) => allowed!.has(String(r[selfCodeKey] ?? ""))) : items;
    }
    // 无列也无反查配置 → 不过滤（调用方保证语义）
  }
  const paged = pageOf(
    items,
    num(url.searchParams.get("page"), 1),
    num(url.searchParams.get("pageSize"), items.length || 1),
  );
  if (!junctions?.aggregate?.length) return HttpResponse.json(paged);
  return HttpResponse.json({
    ...paged,
    items: paged.items.map((r) => {
      const out: Record<string, unknown> = { ...r };
      for (const a of junctions.aggregate!) {
        out[a.as] = [
          ...new Set(
            a.link
              .filter((l) => String(l[a.selfCol] ?? "") === String(r[selfCodeKey] ?? ""))
              .map((l) => {
                const code = String(l[a.otherCol] ?? "");
                return a.names?.get(code) ?? code;
              })
              .filter(Boolean),
          ),
        ].join("，");
      }
      return out;
    }),
  });
}

/** M06 junction：支持 query 参数 → 列精确匹配（键=query 参数名=列名）。 */
function wrapLinks(
  rows: Array<Record<string, unknown>>,
  request: Request,
  filterKeys: Record<string, string>,
) {
  const url = new URL(request.url);
  let items: Array<Record<string, unknown>> = rows;
  for (const [param, col] of Object.entries(filterKeys)) {
    const v = url.searchParams.get(param);
    if (v) items = items.filter((r) => r[col] === v);
  }
  return HttpResponse.json({ items, total: items.length });
}

/** M06 junction DELETE：REF 组件发 query 参数（apiClient.delete(url, { params })），
 * lab-msw handler 读 request body。这里把 query 参数镜像成 body 按 handlers 同款
 * 键匹配语义原地删除（含 extraFields 键如 role）。 */
function linkDelete(arr: Array<Record<string, unknown>>) {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const keys = Array.from(url.searchParams.keys());
    let idx = -1;
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i];
      if (!row) continue;
      const hit = keys.every((k) => String(row[k] ?? "") === url.searchParams.get(k));
      if (hit) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) arr.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  };
}

// ————————————————————————————————————————————————
// Task 11 扩展（reports 4 阶段页 + audit）：
//   - POST /api/receipts/flow：lab-msw 返回裸数组（组件 runFlow 期望 res.data.results）
//     且 withdraw 是 no-op。这里对同一 sampleReceipts fixtures 数组重实现完整语义：
//     submit（前进一阶 + lastSubmittedBy + issuance 补 issuedAt）/ return（后退一阶）/
//     withdraw（后退一阶 + 清 lastSubmittedBy，仅限本人提交的），flowHistory 同步 push。
//     语义参考 lab-msw src/handlers-extra.ts reportFlowExtraHandlers + REF 类型注释
//     （withdraw=提交人主动收回——msw 仓标了 no-op 债，测试穿透需要真流转）。
//   - GET /api/audit-logs：lab-msw 无该 handler。从 fixtures 的 flowHistory 派生审计
//     条目（type='flow'，操作对象=委托书编号），支持 REF auditStore 的分页 + type/keyword
//     过滤参数形状（dateFrom/dateTo 宽松忽略——种子时间线集中，无按日过滤断言需求）。
// ————————————————————————————————————————————————

/** flow 状态流转语义（与 lab-msw handlers-extra nextStatus/prevStatus 一致，含 completed 终态） */
const FLOW_ORDER_FULL = [
  'receiving', 'task_assignment', 'data_entry', 'review', 'approval', 'issuance', 'archived', 'completed',
] as const;

/**
 * 安装 REF 形状适配 handler：
 *  - dictCrud 表（report-names / standards / parameters / inspection-param-interfaces）：裸数组 → {items,total}
 *  - 4 条链接 GET：裸数组 → {items,total}（保留过滤参数语义 + role）
 *  - /samples：+ keyword（sampleCode/sampleName includes）
 *  - /receipts：+ categoryCode / lastSubmittedBy
 *  - /test-records：+ receiptId（经 receipt→samples 归集 sampleIds）
 */
export function installShapeAdapters(server: { use: (...h: unknown[]) => void }): void {
  server.use(
    // —— dictCrud 主表（msw 裸数组 → REF {items}）——
    // Task 13：report-names/inspection-param-interfaces 走 wrapDict（补 id=code + keyword 过滤）；
    // standards/parameters 的 wrapDict（含 junction 反查）在下方 Task 13 段注册——
    // 同 URL 后注册者胜（msw use() 头插），此处不重复注册。
    http.get("*/api/report-names", ({ request }) => wrapDict(inspectionReportNames as unknown as Array<Record<string, unknown>>, request)),
    http.get("*/api/inspection-param-interfaces", ({ request }) => wrapDict(inspectionParamInterfaces as unknown as Array<Record<string, unknown>>, request)),

    // —— 链接 GET（msw 裸数组 → REF {items}）——
    http.get("*/api/report-names/links/standard", ({ request }) => {
      const url = new URL(request.url);
      const rn = url.searchParams.get("reportNameCode");
      const role = url.searchParams.get("role");
      let items: unknown[] = inspectionReportNameStandards;
      if (rn) items = items.filter((l) => (l as { reportNameCode: string }).reportNameCode === rn);
      if (role) items = items.filter((l) => (l as { role: string }).role === role);
      return HttpResponse.json({ items, total: items.length });
    }),
    http.get("*/api/report-names/links/parameter", ({ request }) => {
      const url = new URL(request.url);
      const rn = url.searchParams.get("reportNameCode");
      const items: unknown[] = rn
        ? inspectionReportNameParameters.filter((l) => (l as { reportNameCode: string }).reportNameCode === rn)
        : inspectionReportNameParameters;
      return HttpResponse.json({ items, total: items.length });
    }),
    http.get("*/api/inspection/links/standard-parameter", ({ request }) => {
      const url = new URL(request.url);
      const sc = url.searchParams.get("standardCode");
      const items: unknown[] = sc
        ? inspectionStandardParameters.filter((l) => (l as { inspectionStandardCode: string }).inspectionStandardCode === sc)
        : inspectionStandardParameters;
      return HttpResponse.json({ items, total: items.length });
    }),
    http.get("*/api/inspection-param-interfaces/links", ({ request }) => {
      const url = new URL(request.url);
      // Task 13 Step 3：补 REF 过滤参数族（inspectionParamInterfaceCode / reportNameCode，
      // 见 backup shared lab-handlers.ts paramInterfaceLinkHandlers GET）。原先只支持
      // parameterCode；无这些参数的既有调用行为不变。
      const code = url.searchParams.get("parameterCode");
      const pic = url.searchParams.get("inspectionParamInterfaceCode");
      const rn = url.searchParams.get("reportNameCode");
      let items: unknown[] = inspectionParamInterfaceLinks;
      if (code) items = items.filter((l) => (l as { inspectionParameterCode: string }).inspectionParameterCode === code);
      if (pic) items = items.filter((l) => (l as { inspectionParamInterfaceCode: string }).inspectionParamInterfaceCode === pic);
      if (rn) items = items.filter((l) => (l as { reportNameCode?: string }).reportNameCode === rn);
      return HttpResponse.json({ items, total: items.length });
    }),

    // —— /samples：补 keyword（REF：按 sampleCode/sampleName 搜）——
    http.get("*/api/samples", ({ request }) => {
      const url = new URL(request.url);
      const receiptId = url.searchParams.get("receiptId");
      const keyword = url.searchParams.get("keyword") ?? "";
      let items = samples.filter((s) => s.tenantId === TENANT);
      if (receiptId) items = items.filter((s) => s.receiptId === receiptId);
      if (keyword)
        items = items.filter(
          (s) =>
            (s.sampleCode ?? "").includes(keyword) ||
            (s.sampleName ?? "").includes(keyword),
        );
      return HttpResponse.json(
        pageOf(items, num(url.searchParams.get("page"), 1), num(url.searchParams.get("pageSize"), 20)),
      );
    }),

    // —— /receipts：补 categoryCode / lastSubmittedBy（REF 语义）——
    http.get("*/api/receipts", ({ request }) => {
      const url = new URL(request.url);
      const flowStatus = url.searchParams.get("flowStatus");
      const contractId = url.searchParams.get("contractId");
      const categoryCode = url.searchParams.get("categoryCode");
      const lastSubmittedBy = url.searchParams.get("lastSubmittedBy");
      const keyword = url.searchParams.get("keyword") ?? "";
      let items = sampleReceipts.filter((r) => r.tenantId === TENANT);
      if (flowStatus) items = items.filter((r) => r.flowStatus === flowStatus);
      if (contractId) items = items.filter((r) => r.contractId === contractId);
      if (categoryCode) items = items.filter((r) => r.categoryCode === categoryCode);
      if (lastSubmittedBy) items = items.filter((r) => r.lastSubmittedBy === lastSubmittedBy);
      if (keyword) items = items.filter((r) => r.commissionCode.includes(keyword));
      return HttpResponse.json(
        pageOf(items, num(url.searchParams.get("page"), 1), num(url.searchParams.get("pageSize"), 20)),
      );
    }),

    // —— /test-records：补 receiptId 过滤（经 receipt→samples 归集 sampleIds）——
    http.get("*/api/test-records", ({ request }) => {
      const url = new URL(request.url);
      const sampleId = url.searchParams.get("sampleId");
      const receiptId = url.searchParams.get("receiptId");
      let items = testRecords.filter((t) => t.tenantId === TENANT);
      if (sampleId) items = items.filter((t) => t.sampleId === sampleId);
      if (receiptId) {
        const sids = new Set(
          samples.filter((s) => s.receiptId === receiptId).map((s) => s.id),
        );
        items = items.filter((t) => sids.has(t.sampleId));
      }
      return HttpResponse.json(
        pageOf(items, num(url.searchParams.get("page"), 1), num(url.searchParams.get("pageSize"), 20)),
      );
    }),

    // —— POST /receipts/flow：REF 形状 {results} + 完整流转语义（Task 11）——
    // lab-msw 返回裸数组且 withdraw no-op；组件 runFlow 读 res.data.results。
    // 对同一 sampleReceipts fixtures 原地流转，flowHistory push（数据同源）。
    http.post("*/api/receipts/flow", async ({ request }) => {
      const body = (await request.json()) as {
        ids: string[];
        action: "submit" | "return" | "withdraw";
        operator: string;
        reason?: string;
      };
      const now = new Date().toISOString();
      const results = body.ids.map((id) => {
        const r = sampleReceipts.find((x) => x.id === id) as
          | { id: string; commissionCode?: string; flowStatus: string; lastSubmittedBy?: string | null; issuedAt?: string | null; flowHistory?: unknown[]; updatedAt?: string }
          | undefined;
        if (!r) return { id, ok: false, message: "Receipt not found" };
        const idx = FLOW_ORDER_FULL.indexOf(r.flowStatus as (typeof FLOW_ORDER_FULL)[number]);
        if (idx < 0) return { id, ok: false, message: `Unknown flowStatus: ${r.flowStatus}` };
        const to =
          body.action === "submit"
            ? FLOW_ORDER_FULL[idx + 1]
            : FLOW_ORDER_FULL[idx - 1];
        if (!to) {
          return {
            id,
            ok: false,
            message:
              body.action === "submit" ? "Already at final stage" : "Already at first stage",
          };
        }
        // withdraw 仅限本人最近提交的单据（提交人主动收回）
        if (body.action === "withdraw" && r.lastSubmittedBy !== body.operator) {
          return { id, ok: false, message: "只能撤回本人提交的单据" };
        }
        const from = r.flowStatus;
        r.flowStatus = to;
        if (body.action === "submit") {
          r.lastSubmittedBy = body.operator;
          if (to === "issuance") r.issuedAt = now;
        } else if (body.action === "withdraw") {
          r.lastSubmittedBy = null;
        }
        (r.flowHistory ??= []).push({
          action: body.action,
          from,
          to,
          operator: body.operator,
          at: now,
          reason: body.reason,
        });
        r.updatedAt = now;
        return { id, ok: true, flowStatus: r.flowStatus };
      });
      return HttpResponse.json({ results });
    }),

    // ———— Task 13 扩展（M06 检测能力 10 组件）————
    // lab-msw dictCrud/junction GET 返回裸数组且不支持 REF 的过滤参数族
    // （keyword / inspectionSpecialtyCode / inspectionObjectCode / inspectionStandardCode /
    //   testingStandardCode / judgmentStandardCode / reportNameCode / inspectionParamInterfaceCode）。
    // 这里对同一 fixtures 数组重实现 REF 语义：裸数组 → {items,total} + 全过滤参数。
    // 主表路由（/api/inspection/specialties 等）REF 组件按 `/:id` PUT/DELETE，msw dictCrud
    // 按 `/:code`——seed 行无 id 列，组件行 id 取 code 语义（rowId 读 (item as {id}).id，
    // 适配层在 wrap 时补 id=code，PUT/DELETE `/:code` 天然命中 msw handler）。
    // 计算规则 / 技术要求 msw 主键是复合键，REF 组件 PUT/DELETE `/:id`——在 wrap 时
    // 补 id（`cr-${objectCode}-${parameterCode}` / `tr-${objectCode}-${parameterCode}-${std}`），
    // 并拦截 PUT/DELETE `/:id` 反查复合键转发 fixtures 原地写。
    http.get("*/api/inspection/specialties", ({ request }) =>
      wrapDict(inspectionSpecialties as unknown as Array<Record<string, unknown>>, request)),
    http.get("*/api/inspection/objects", ({ request }) =>
      wrapDict(inspectionObjects as unknown as Array<Record<string, unknown>>, request, {
        // 聚合列（老 shared 语义）：parameterNames（经 object-parameter，名称）+ standardCodes（经 object-standard）
        aggregate: [
          {
            as: "parameterNames",
            link: inspectionObjectParameters as unknown as Array<Record<string, unknown>>,
            selfCol: "inspectionObjectCode",
            otherCol: "inspectionParameterCode",
            names: new Map(
              (inspectionParameters as unknown as Array<{ code: string; name: string }>).map((p) => [
                String(p.code),
                String(p.name),
              ]),
            ),
          },
          {
            as: "standardCodes",
            link: inspectionObjectStandards as unknown as Array<Record<string, unknown>>,
            selfCol: "inspectionObjectCode",
            otherCol: "inspectionStandardCode",
          },
        ],
      })),
    // standards 有 status 列（active/superseded/draft），REF 状态列直读；
    // 按专项/项目过滤经 junction 反查（REF 语义）
    http.get("*/api/inspection/standards", ({ request }) =>
      wrapDict(inspectionStandards as unknown as Array<Record<string, unknown>>, request, {
        reverse: {
          inspectionSpecialtyCode: [
            {
              link: inspectionSpecialtyObjects as unknown as Array<Record<string, unknown>>,
              from: "inspectionSpecialtyCode",
              to: "inspectionObjectCode",
            },
            {
              link: inspectionObjectStandards as unknown as Array<Record<string, unknown>>,
              from: "inspectionObjectCode",
              to: "inspectionStandardCode",
            },
          ],
          inspectionObjectCode: [
            {
              link: inspectionObjectStandards as unknown as Array<Record<string, unknown>>,
              from: "inspectionObjectCode",
              to: "inspectionStandardCode",
            },
          ],
        },
        // 聚合列（老 shared 语义）：parameterNames（经 standard-parameter，名称）
        aggregate: [
          {
            as: "parameterNames",
            link: inspectionStandardParameters as unknown as Array<Record<string, unknown>>,
            selfCol: "inspectionStandardCode",
            otherCol: "inspectionParameterCode",
            names: new Map(
              (inspectionParameters as unknown as Array<{ code: string; name: string }>).map((p) => [
                String(p.code),
                String(p.name),
              ]),
            ),
          },
        ],
      })),

    // parameters 按专项/项目过滤经 junction 反查；按标准过滤经 standard-parameter 反查
    http.get("*/api/inspection/parameters", ({ request }) =>
      wrapDict(inspectionParameters as unknown as Array<Record<string, unknown>>, request, {
        reverse: {
          inspectionSpecialtyCode: [
            {
              link: inspectionSpecialtyObjects as unknown as Array<Record<string, unknown>>,
              from: "inspectionSpecialtyCode",
              to: "inspectionObjectCode",
            },
            {
              link: inspectionObjectParameters as unknown as Array<Record<string, unknown>>,
              from: "inspectionObjectCode",
              to: "inspectionParameterCode",
            },
          ],
          inspectionObjectCode: [
            {
              link: inspectionObjectParameters as unknown as Array<Record<string, unknown>>,
              from: "inspectionObjectCode",
              to: "inspectionParameterCode",
            },
          ],
          inspectionStandardCode: [
            {
              link: inspectionStandardParameters as unknown as Array<Record<string, unknown>>,
              from: "inspectionStandardCode",
              to: "inspectionParameterCode",
            },
          ],
        },
        // 聚合列（老 shared 语义）：objectNames（经 object-parameter 反查，名称）+ standardCodes（经 standard-parameter）
        aggregate: [
          {
            as: "objectNames",
            link: inspectionObjectParameters as unknown as Array<Record<string, unknown>>,
            selfCol: "inspectionParameterCode",
            otherCol: "inspectionObjectCode",
            names: new Map(
              (inspectionObjects as unknown as Array<{ code: string; name: string }>).map((o) => [
                String(o.code),
                String(o.name),
              ]),
            ),
          },
          {
            as: "standardCodes",
            link: inspectionStandardParameters as unknown as Array<Record<string, unknown>>,
            selfCol: "inspectionParameterCode",
            otherCol: "inspectionStandardCode",
          },
        ],
      })),

    // —— junction GET（4 类 + report-name 3 类 + inspection-param-interface links，裸数组 → {items,total} + 过滤参数）——
    http.get("*/api/inspection/links/specialty-object", ({ request }) =>
      wrapLinks(inspectionSpecialtyObjects as unknown as Array<Record<string, unknown>>, request, {
        inspectionSpecialtyCode: "inspectionSpecialtyCode",
      })),
    http.get("*/api/inspection/links/object-standard", ({ request }) =>
      wrapLinks(inspectionObjectStandards as unknown as Array<Record<string, unknown>>, request, {
        inspectionObjectCode: "inspectionObjectCode",
        role: "role",
      })),
    http.get("*/api/inspection/links/object-parameter", ({ request }) =>
      wrapLinks(inspectionObjectParameters as unknown as Array<Record<string, unknown>>, request, {
        inspectionObjectCode: "inspectionObjectCode",
        inspectionParameterCode: "inspectionParameterCode",
      })),
    http.get("*/api/report-names/links/object", ({ request }) =>
      wrapLinks(inspectionObjectReportNames as unknown as Array<Record<string, unknown>>, request, {
        reportNameCode: "reportNameCode",
        inspectionObjectCode: "inspectionObjectCode",
      })),

    // —— junction DELETE：REF 组件发 query 参数，msw handler 读 body——query → 键匹配原地删除
    http.delete("*/api/inspection/links/specialty-object", linkDelete(inspectionSpecialtyObjects as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/inspection/links/object-standard", linkDelete(inspectionObjectStandards as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/inspection/links/object-parameter", linkDelete(inspectionObjectParameters as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/report-names/links/object", linkDelete(inspectionObjectReportNames as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/report-names/links/standard", linkDelete(inspectionReportNameStandards as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/report-names/links/parameter", linkDelete(inspectionReportNameParameters as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/inspection-param-interfaces/links", linkDelete(inspectionParamInterfaceLinks as unknown as Array<Record<string, unknown>>)),
    http.delete("*/api/inspection/links/standard-parameter", linkDelete(inspectionStandardParameters as unknown as Array<Record<string, unknown>>)),

    // —— 计算规则 GET：+ testingStandardCode 过滤（msw 只支持 object/parameter）——
    http.get("*/api/calculation-rules", ({ request }) => {
      const url = new URL(request.url);
      const std = url.searchParams.get("testingStandardCode");
      let items = (inspectionCalculationRules as unknown as Array<Record<string, unknown>>)
        .map((r): Record<string, unknown> => ({ ...r, id: String(r["id"] ?? `cr-${r["inspectionObjectCode"]}-${r["inspectionParameterCode"]}`) }));
      if (std) items = items.filter((r) => r["testingStandardCode"] === std);
      return HttpResponse.json(pageOf(items, num(url.searchParams.get("page"), 1), num(url.searchParams.get("pageSize"), items.length || 1)));
    }),
    // 计算规则 PUT/DELETE /:id → 复合键转发（REF 组件以 id 调用，msw 是复合键路由）
    http.put("*/api/calculation-rules/:id", async ({ params, request }) => {
      const row = (inspectionCalculationRules as unknown as Array<Record<string, unknown>>)
        .find((r) => String(r["id"] ?? `cr-${r["inspectionObjectCode"]}-${r["inspectionParameterCode"]}`) === params.id);
      if (!row) return HttpResponse.json({ message: "CalculationRule not found" }, { status: 404 });
      Object.assign(row, (await request.json()) as object, { updatedAt: new Date().toISOString() });
      return HttpResponse.json(row);
    }),
    http.delete("*/api/calculation-rules/:id", ({ params }) => {
      const arr = inspectionCalculationRules as unknown as Array<Record<string, unknown>>;
      const i = arr.findIndex((r) => String(r["id"] ?? `cr-${r["inspectionObjectCode"]}-${r["inspectionParameterCode"]}`) === params.id);
      if (i < 0) return HttpResponse.json({ message: "CalculationRule not found" }, { status: 404 });
      arr.splice(i, 1);
      return new HttpResponse(null, { status: 204 });
    }),

    // —— 技术要求 GET：+ judgmentStandardCode 过滤（msw 只支持 object/parameter）——
    http.get("*/api/technical-requirements", ({ request }) => {
      const url = new URL(request.url);
      const std = url.searchParams.get("judgmentStandardCode");
      let items = (technicalRequirements as unknown as Array<Record<string, unknown>>)
        .map((r): Record<string, unknown> => ({ ...r, id: String(r["id"] ?? `tr-${r["inspectionObjectCode"]}-${r["inspectionParameterCode"]}-${r["judgmentStandardCode"]}`) }));
      if (std) items = items.filter((r) => r["judgmentStandardCode"] === std);
      return HttpResponse.json(pageOf(items, num(url.searchParams.get("page"), 1), num(url.searchParams.get("pageSize"), items.length || 1)));
    }),
    http.put("*/api/technical-requirements/:id", async ({ params, request }) => {
      const row = (technicalRequirements as unknown as Array<Record<string, unknown>>)
        .find((r) => String(r.id ?? `tr-${r.inspectionObjectCode}-${r.inspectionParameterCode}-${r.judgmentStandardCode}`) === params.id);
      if (!row) return HttpResponse.json({ message: "TechnicalRequirement not found" }, { status: 404 });
      Object.assign(row, (await request.json()) as object, { updatedAt: new Date().toISOString() });
      return HttpResponse.json(row);
    }),
    http.delete("*/api/technical-requirements/:id", ({ params }) => {
      const arr = technicalRequirements as unknown as Array<Record<string, unknown>>;
      const i = arr.findIndex((r) => String(r.id ?? `tr-${r.inspectionObjectCode}-${r.inspectionParameterCode}-${r.judgmentStandardCode}`) === params.id);
      if (i < 0) return HttpResponse.json({ message: "TechnicalRequirement not found" }, { status: 404 });
      arr.splice(i, 1);
      return new HttpResponse(null, { status: 204 });
    }),

    // —— GET /audit-logs：从 flowHistory 派生审计条目（Task 11；lab-msw 无此端点）——
    // 组件 catch 兜底是 error 提示而非崩溃，但列表页 smoke 取「空数据也正常渲染」
    // 之外再给一条真实数据路径：每条 flowHistory 生成 type='flow' 的条目。
    // ---- Task 13 Step 3（M06.F08 参数界面 REF 语义）----
    // msw dictCrud 以 code 为主键（POST 无 id/isOfficial 形状、PUT/DELETE /:code、
    // links POST 204 裸 push）；REF 组件/测试按 /:id（id=`pi-${code}`）调用，且
    // REF shared lab-handlers.ts paramInterfaceHandlers/paramInterfaceLinkHandlers 有：
    //   POST 校验 + 重复 400；DELETE 内置（isOfficial）不可删 400；
    //   links POST 确定性 id + 重复 400 + 201。
    // 这里对同一 inspectionParamInterfaces / inspectionParamInterfaceLinks fixtures 原地实现 REF 语义。
    http.post("*/api/inspection-param-interfaces", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      if (!body["code"] || !body["name"] || !body["componentPath"])
        return HttpResponse.json({ message: "code/name/componentPath 必填" }, { status: 400 });
      if ((inspectionParamInterfaces as unknown as Array<{ code?: string }>).some((r) => r.code === body["code"]))
        return HttpResponse.json({ message: "参数界面编码已存在" }, { status: 400 });
      const now = new Date().toISOString();
      const row = {
        id: `pi-${String(body["code"])}`,
        code: body["code"],
        name: body["name"],
        componentPath: body["componentPath"],
        config: body["config"] ?? null,
        description: body["description"] ?? "",
        sortOrder: body["sortOrder"] ?? 999999,
        isOfficial: false,
        createdAt: now,
        updatedAt: now,
      };
      inspectionParamInterfaces.push(row as unknown as (typeof inspectionParamInterfaces)[number]);
      return HttpResponse.json(row, { status: 201 });
    }),
    http.put("*/api/inspection-param-interfaces/:id", async ({ params, request }) => {
      const arr = inspectionParamInterfaces as unknown as Array<Record<string, unknown>>;
      const row = arr.find((r) => r["id"] === params.id || r["code"] === params.id);
      if (!row) return HttpResponse.json({ message: "InspectionParamInterface not found" }, { status: 404 });
      Object.assign(row, (await request.json()) as object, { updatedAt: new Date().toISOString() });
      return HttpResponse.json(row);
    }),
    http.delete("*/api/inspection-param-interfaces/:id", ({ params }) => {
      const arr = inspectionParamInterfaces as unknown as Array<Record<string, unknown>>;
      const i = arr.findIndex((r) => r["id"] === params.id || r["code"] === params.id);
      if (i < 0) return HttpResponse.json({ message: "参数界面不存在" }, { status: 404 });
      if (arr[i]!["isOfficial"])
        return HttpResponse.json({ message: "内置模型不可删除" }, { status: 400 });
      arr.splice(i, 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post("*/api/inspection-param-interfaces/links", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      if (!body["inspectionParameterCode"] || !body["inspectionParamInterfaceCode"])
        return HttpResponse.json({ message: "inspectionParameterCode/inspectionParamInterfaceCode 必填" }, { status: 400 });
      const id = body["reportNameCode"]
        ? `pi-param-${String(body["inspectionParamInterfaceCode"])}-${String(body["inspectionParameterCode"])}-${String(body["reportNameCode"])}`
        : `pi-param-${String(body["inspectionParamInterfaceCode"])}-${String(body["inspectionParameterCode"])}`;
      const arr = inspectionParamInterfaceLinks as unknown as Array<Record<string, unknown>>;
      if (arr.some((r) => r["id"] === id))
        return HttpResponse.json({ message: "关联已存在" }, { status: 400 });
      const now = new Date().toISOString();
      const row = {
        id,
        inspectionParameterCode: body["inspectionParameterCode"],
        inspectionParamInterfaceCode: body["inspectionParamInterfaceCode"],
        reportNameCode: body["reportNameCode"],
        createdAt: now,
        updatedAt: now,
      };
      arr.push(row as unknown as Record<string, unknown>);
      return HttpResponse.json(row, { status: 201 });
    }),

    http.get("*/api/audit-logs", ({ request }) => {
      const url = new URL(request.url);
      const type = url.searchParams.get("type");
      const keyword = url.searchParams.get("keyword") ?? "";
      const entries: Array<{
        id: string; type: string; action: string; operator: string;
        target: string; targetId?: string; detail?: string; at: string; ip?: string;
      }> = [];
      for (const r of sampleReceipts) {
        const rec = r as {
          id: string; commissionCode?: string; flowHistory?: Array<{
            action: string; from: string; to: string; operator: string; at: string; reason?: string;
          }>;
        };
        for (const [i, h] of (rec.flowHistory ?? []).entries()) {
          const actionLabel =
            h.action === "submit" ? "提交" : h.action === "return" ? "退回" : "撤回";
          entries.push({
            id: `audit-${rec.id}-${i}`,
            type: "flow",
            action: `${actionLabel}（${h.from} → ${h.to}）`,
            operator: h.operator,
            target: rec.commissionCode ?? rec.id,
            targetId: rec.id,
            detail: h.reason,
            at: h.at,
          });
        }
      }
      let items = entries;
      if (type) items = items.filter((e) => e.type === type);
      if (keyword) {
        items = items.filter(
          (e) =>
            e.action.includes(keyword) ||
            e.operator.includes(keyword) ||
            e.target.includes(keyword) ||
            (e.detail ?? "").includes(keyword),
        );
      }
      // 时间倒序（最新在前，符合审计日志惯例）
      items = [...items].sort((a, b) => b.at.localeCompare(a.at));
      return HttpResponse.json(
        pageOf(items, num(url.searchParams.get("page"), 1), num(url.searchParams.get("pageSize"), 20)),
      );
    }),
  );
}

// ————————————————————————————————————————————————
// tablesOf：REF 测试的 `xxxTable` 单例兼容门面（写 lab-msw fixtures 可变数组）
// ————————————————————————————————————————————————

export interface TableView<T> {
  insert: (row: T) => T;
  all: () => T[];
  findById: (id: string) => T | undefined;
  reset: () => void;
}

/** 把可变 fixture 数组包成 MockTable 风格视图（insert/all/findById/reset）。
 * insert 缺 id 时补随机 id（对齐 REF MockTable.insert 的 randomUUID 行为）。 */
function tableView<T>(arr: T[]): TableView<T> {
  return {
    insert: (row) => {
      const withId = { id: crypto.randomUUID(), ...row } as T;
      (arr as T[]).push(withId);
      return withId;
    },
    all: () => arr,
    findById: (id) => (arr as Array<T & { id?: string }>).find((r) => r.id === id),
    reset: () => {
      (arr as T[]).length = 0;
    },
  };
}


/**
 * 暴露 REF 测试的 `xxxTable` 命名（替代旧 `import { receiptTable } from '../../msw/db'`）：
 *   const { receiptTable, sampleTable } = tablesOf()
 * 注意：
 *   - dictCrud 表（报告名称/参数/标准/参数界面）msw seed 无 id 列（PK 是 code），
 *     REF 测试用确定性 id 插入的行照常写入（组件按 code 读，不受影响）。
 *   - 插入 receipt/sample/testRecord 行需带 tenantId:'TENANT-001' 才能被
 *     byTenant 过滤命中。.reset() 只清空不恢复快照——恢复用 resetFixtures()。
 *   - REF 调用形态 `tablesOf(server)`（shared MockServer 句柄）；本仓 fixtures
 *     不需要 server，参数仅为签名兼容，传入即忽略。
 */
type RowRecord = { id?: string; code?: string; [k: string]: unknown };

/** org-infos 独立内存表（lab-msw 无该端点；REF orgInfoTable 等价物）。 */
const orgInfos: RowRecord[] = [];

export function tablesOf(_server?: unknown): {
  receiptTable: TableView<RowRecord>;
  sampleTable: TableView<RowRecord>;
  contractTable: TableView<RowRecord>;
  testRecordTable: TableView<RowRecord>;
  inspectionReportNameTable: TableView<RowRecord>;
  inspectionParameterTable: TableView<RowRecord>;
  inspectionStandardTable: TableView<RowRecord>;
  inspectionStandardParameterTable: TableView<RowRecord>;
  paramInterfaceTable: TableView<RowRecord>;
  inspectionParameterParamInterfaceTable: TableView<RowRecord>;
  orgInfoTable: TableView<RowRecord>;
} {
  const asRows = (a: unknown[]) => a as RowRecord[];
  return {
    receiptTable: tableView(asRows(sampleReceipts)),
    sampleTable: tableView(asRows(samples)),
    contractTable: tableView(asRows(contracts)),
    testRecordTable: tableView(asRows(testRecords)),
    inspectionReportNameTable: tableView(asRows(inspectionReportNames)),
    inspectionParameterTable: tableView(asRows(inspectionParameters)),
    inspectionStandardTable: tableView(asRows(inspectionStandards)),
    inspectionStandardParameterTable: tableView(asRows(inspectionStandardParameters)),
    paramInterfaceTable: tableView(asRows(inspectionParamInterfaces)),
    inspectionParameterParamInterfaceTable: tableView(asRows(inspectionParamInterfaceLinks)),
    orgInfoTable: tableView(orgInfos),
  };
  void _server; // REF 调用签名兼容参数（tablesOf(server)），本仓 fixtures 不需要
}

// ————————————————————————————————————————————————
// seedParamInterfaces / seedMasterDataIntoMockDb / seedData
// ————————————————————————————————————————————————

/**
 * 参数界面种子（M06.F08）：灌入 generated JSON 中的卡片模型注册表 + 参数↔界面关联。
 *
 * REF tests/helpers/seed.ts seedParamInterfaces(server) 的等价物：清空两张 fixtures
 * 后按 generated JSON 重灌（id 形态 `pi-${code}` / `pi-param-...` 与 REF 一致）。
 * 参数 `_server` 仅为 REF 调用签名兼容（`seedParamInterfaces(server)`），值被忽略。
 */
export function seedParamInterfaces(_server?: unknown): void {
  void _server
  const now = new Date('2026-07-22T00:00:00Z').toISOString()
  const piRows = paramInterfacesJson as Array<{
    code: string; name: string; componentPath: string
    config?: Record<string, unknown> | null; description?: string
    sortOrder: number; isOfficial?: boolean
  }>
  inspectionParamInterfaces.length = 0
  for (const r of piRows) {
    inspectionParamInterfaces.push({
      id: `pi-${r.code}`, code: r.code, name: r.name, componentPath: r.componentPath,
      config: r.config ?? null, description: r.description, sortOrder: r.sortOrder,
      isOfficial: r.isOfficial, createdAt: now, updatedAt: now, tenantId: TENANT,
    } as unknown as (typeof inspectionParamInterfaces)[number])
  }

  const linkRows = paramInterfaceLinksJson as Array<{
    inspectionParameterCode: string; inspectionParamInterfaceCode: string; reportNameCode?: string
  }>
  inspectionParamInterfaceLinks.length = 0
  for (const link of linkRows) {
    inspectionParamInterfaceLinks.push({
      id: link.reportNameCode
        ? `pi-param-${link.inspectionParamInterfaceCode}-${link.inspectionParameterCode}-${link.reportNameCode}`
        : `pi-param-${link.inspectionParamInterfaceCode}-${link.inspectionParameterCode}`,
      inspectionParameterCode: link.inspectionParameterCode,
      inspectionParamInterfaceCode: link.inspectionParamInterfaceCode,
      reportNameCode: link.reportNameCode,
      createdAt: now, updatedAt: now, tenantId: TENANT,
    } as unknown as (typeof inspectionParamInterfaceLinks)[number])
  }
}

/**
 * REF 的 seedMasterDataIntoMockDb 把 generated JSON 按确定性 id 重灌。
 * 本仓 lab-msw 的 seeds/*.json 就是同一份 generated 数据（模块加载即就位），
 * 无需重灌——no-op。测试要「干净」请用 resetFixtures()。
 */
export function seedMasterDataIntoMockDb(_server?: unknown): void {
  void _server
  /* no-op：lab-msw seeds 已含主数据（见上） */
}

// ———— Sprint 2 Batch 0 裁剪 ————
// seedData（REF 10 合同 × 30 RN 接样单大种子，含水泥/钢筋强度计算）依赖
// @/features/data-entry/{reportTemplateSeed, models/cement-strength, models/rebar-welding}，
// 随 Batch 4（data-entry 镜像）回填。Batch 0-3 的 dom 测试只用
// installShapeAdapters / tablesOf / seedParamInterfaces / seedMasterDataIntoMockDb。
