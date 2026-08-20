// Sprint 1 前端绑定契约消费入口。
// SSOT: ../lab-management-system-shared/tsp/contracts/frontend-bind.tsp
//       → generated/openapi/openapi.yaml components.schemas
//       → orval → src/api/endpoints/endpoints.schemas.ts（此处只 re-export + 派生）
// 本文件不引入 runtime 库；行为签名见 shared/.state/decision-log.md §2。

import {
  AuthHeaderKind,
  BackendId,
} from "./endpoints/endpoints.schemas";
import type {
  AuthState,
  BackendRegistry,
  BackendConfig,
  AuthContext,
  AuthStateAnonymous,
  AuthStateAnonymousValue,
  AuthStateAuthenticated,
  AuthStateAuthenticatedValue,
  AuthStateAwaitingTenant,
  AuthStateAwaitingTenantValue,
  AuthStateIdle,
  AuthStateIdleValue,
  BackendFeatures,
  TokenStorageKeys,
} from "./endpoints/endpoints.schemas";

export type {
  AuthContext,
  AuthState,
  AuthStateAnonymous,
  AuthStateAnonymousValue,
  AuthStateAuthenticated,
  AuthStateAuthenticatedValue,
  AuthStateAwaitingTenant,
  AuthStateAwaitingTenantValue,
  AuthStateIdle,
  AuthStateIdleValue,
  BackendConfig,
  BackendFeatures,
  BackendRegistry,
  TokenStorageKeys,
};
export { AuthHeaderKind, BackendId };

// 行为契约（decision-log §2.1/§2.2 的 TS 签名；TypeSpec 不允许 model 挂方法，此处落地）

/** 切换激活后端；持久化由消费方负责 */
export type SwitchBackendFn = (id: BackendId) => void;

/** 订阅后端切换事件；返回 unsub 函数 */
export type OnBackendSwitchHandler = (newId: BackendId) => void;
export type UnsubscribeFn = () => void;

/** AuthContext 行为签名（React 侧由 src/state/auth-context.tsx 实现） */
export interface AuthContextActions {
  login(req: import("./endpoints/endpoints.schemas").LoginRequest): Promise<
    import("./endpoints/endpoints.schemas").LoginResponse | import("./endpoints/endpoints.schemas").ErrorResponse
  >;
  logout(): Promise<void>;
  /** 静默刷新：基于 refreshToken；401 时退到 anonymous */
  refresh(): Promise<
    import("./endpoints/endpoints.schemas").LoginResponse | import("./endpoints/endpoints.schemas").ErrorResponse
  >;
  /** 登录后选租户（仅在 awaiting_tenant 态可调） */
  switchTenant(req: import("./endpoints/endpoints.schemas").SwitchTenantRequest): Promise<
    import("./endpoints/endpoints.schemas").LoginResponse | import("./endpoints/endpoints.schemas").ErrorResponse
  >;
  /** RBAC 单点判断（来自 /auth/permissions 缓存） */
  hasPermission(perm: string): boolean;
  onChange(handler: (state: AuthState) => void): UnsubscribeFn;
}

// 持久化 key 常量 — TokenStorageKeys 契约的运行时形态。
// orval 对字符串字面量类型生成 TokenStorageKeysAccessToken 等独立枚举，
// 这里直接展平成常量对象，避免消费点写裸字符串。
export const TOKEN_STORAGE_KEYS = {
  accessToken: "lab.accessToken",
  refreshToken: "lab.refreshToken",
  activeTenantId: "lab.activeTenantId",
  activeBackend: "lab.activeBackend",
  permissionsCache: "lab.permissions",
} as const;

// 4 槽位默认注册表 — BackendConfig 契约的 lab family 缺省值（信息性）。
// ADR-0014：运行时不再切后端；baseUrl 仍走 env（VITE_API_BASE_URL 单 URL）。
// 这里 4 个槽位的 baseUrl 都回退到 env.apiBaseUrl（无独立 default），
// 保留 BACKEND_REGISTRY_DEFAULT 仅作为契约类型的展示 — LoginPage 已不再查它。
import { env } from "@/lib/env";

export const BACKEND_REGISTRY_DEFAULT: BackendRegistry = {
  active: "msw",
  available: [
    {
      id: "msw",
      label: "MSW Mock",
      baseUrl: env.apiBaseUrl,
      authHeader: "Authorization",
      features: { sso: true, realDb: false },
    },
    {
      id: "nextjs",
      label: "Next.js API",
      baseUrl: env.apiBaseUrl,
      authHeader: "Authorization",
      ssoCallbackPath: "/api/auth/sso/callback",
      features: { sso: true, realDb: true },
    },
    {
      id: "springboot",
      label: "Spring Boot",
      baseUrl: env.apiBaseUrl,
      authHeader: "Authorization",
      features: { sso: true, realDb: true },
    },
    {
      id: "aspnetcore",
      label: "ASP.NET Core",
      baseUrl: env.apiBaseUrl,
      authHeader: "Authorization",
      features: { sso: true, realDb: true },
    },
  ],
};