// lab-nextjs src/api/legacy-client.ts 的镜像（Sprint 2 Batch 0）。
// features 层数据获取统一走 apiClient + API_ROUTES（与 nextjs 仓行为 1:1，
// 禁令解读见 docs/adr/0009-legacy-client-data-layer.md）。
//
// 与 nextjs 版的差异（镜像改造点，见 ADR）：
//   - token 注入改 callback 形式 installLegacyClient(getToken, onUnauthorized)，
//     main.tsx 从 auth-context FSM 桥接（nextjs 版的 setToken 是给 zustand authStore 用的）
//   - identityClient / env.ts 不搬（SSO/authStore 专属，react 仓走自己的 auth FSM）
import axios, { AxiosError, type AxiosInstance } from "axios";
import { getApiBaseUrl } from "./backend-config";

let getToken: () => string | null = () => null;
let unauthorizedHandler: (() => void) | null = null;

/**
 * 注入 token 来源 + 401 处理。main.tsx 启动时调一次。
 * getToken 用 callback 形式避免循环依赖（与 http-client.ts 同款模式）。
 */
export function installLegacyClient(
  tokenSource: () => string | null,
  onUnauthorized?: () => void,
): void {
  getToken = tokenSource;
  if (onUnauthorized) unauthorizedHandler = onUnauthorized;
}

export function resetApiClient(): void {
  getToken = () => null;
  unauthorizedHandler = null;
}

export const apiClient: AxiosInstance = axios.create({ baseURL: "" });

// @entry M01.F05.I02
//   apiClient 请求拦截器：注入 Authorization: Bearer <token>（经 installLegacyClient 桥接 FSM）
//   响应拦截器：401 调 unauthorizedHandler（清 token 落 anonymous）
apiClient.interceptors.request.use((config) => {
  if (!config.baseURL) config.baseURL = getApiBaseUrl() || "";
  const token = getToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});
apiClient.interceptors.response.use(
  (r) => r,
  (err: unknown) => {
    if (err instanceof AxiosError && err.response?.status === 401) unauthorizedHandler?.();
    return Promise.reject(err);
  },
);

/**
 * REF 旧路由 → lab-msw OpenAPI v2 路由。键以 REF 源码出现过的字面量为准。
 * 值带 `/api` 前缀 —— shared/openapi.yaml 与 msw handlers（BASE="/api"）的
 * 真实路径形态。与 nextjs 仓 legacy-client 逐条一致（镜像不改动）。
 */
export const API_ROUTES = {
  "/audit-logs": "/api/audit-logs",
  "/auth/login": "/api/auth/login",
  "/auth/oauth/callback": "/api/auth/sso/callback",
  "/auth/permissions": "/api/auth/permissions",
  "/auth/menus": "/api/auth/menus",
  "/contracts": "/api/contracts",
  "/inspection-calculation-methods": "/api/calculation-methods",
  "/inspection-objects": "/api/inspection/objects",
  "/inspection-parameters": "/api/inspection/parameters",
  "/inspection-parameter-param-interfaces": "/api/inspection-param-interfaces/links",
  "/inspection-report-name-parameters": "/api/report-names/links/parameter",
  "/inspection-report-name-standards": "/api/report-names/links/standard",
  "/inspection-standard-parameters": "/api/inspection/links/standard-parameter",
  "/inspection-standards": "/api/inspection/standards",
  "/inspection-technical-requirements": "/api/technical-requirements",
  "/inspection-param-interfaces": "/api/inspection-param-interfaces",
  "/receipts": "/api/receipts",
  "/receipts/flow": "/api/receipts/flow",
  "/report-names": "/api/report-names",
  "/samples": "/api/samples",
  "/standard-parameters": "/api/inspection/links/standard-parameter",
  "/summary": "/api/summary",
  "/test-records": "/api/test-records",
  // —— SampleManagerModal 四码表 + ReportPreviewModal 机构信息 ——
  // msw 暂无 /api/org-info handler：组件 catch 兜底为 null（REF 同行为）。
  "/models": "/api/catalog/models",
  "/specifications": "/api/catalog/specs",
  "/grades": "/api/catalog/grades",
  "/brands": "/api/catalog/brands",
  "/org-info": "/api/org-info",
  // —— M06 检测能力 10 组件 ——
  // 4 主表 CRUD + 4 类 junction link。msw dictCrud 裸数组 → {items} 由
  // tests/helpers/seed.ts installShapeAdapters 包（同 nextjs 仓模式）。
  "/inspection-specialties": "/api/inspection/specialties",
  "/inspection-specialty-objects": "/api/inspection/links/specialty-object",
  "/inspection-object-standards": "/api/inspection/links/object-standard",
  "/inspection-object-parameters": "/api/inspection/links/object-parameter",
  "/inspection-object-report-names": "/api/report-names/links/object",
} as const;