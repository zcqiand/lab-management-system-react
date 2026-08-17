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

// 4 槽位默认注册表 — BackendConfig 契约的 lab family 缺省值。
// baseUrl 走 src/lib/env.ts（VITE_BACKEND_URL_*），与 backend-config.ts 的
// DEFAULT_BASE_URLS 共享同一 env 来源。
import { env } from "@/lib/env";

export const BACKEND_REGISTRY_DEFAULT: BackendRegistry = {
  active: env.defaultBackend,
  available: [
    {
      id: "msw",
      label: "MSW Mock",
      baseUrl: env.backendBaseUrls.msw,
      authHeader: "Authorization",
      // msw 后端 SSO handler 已实现（handlers-extra.ts /auth/sso/authorize +
      // /auth/sso/callback，callback 返回 mock-jwt），前端 LoginPage 检测到
      // sso: true 自动跳 saas /login。saas dev server 不在 3000 时用
      // `VITE_SAAS_BASE_URL` 环境变量覆写。
      features: { sso: true, realDb: false },
    },
    {
      id: "nextjs",
      label: "Next.js API",
      baseUrl: env.backendBaseUrls.nextjs,
      authHeader: "Authorization",
      ssoCallbackPath: "/api/auth/sso/callback",
      features: { sso: true, realDb: true },
    },
    {
      id: "springboot",
      label: "Spring Boot",
      baseUrl: env.backendBaseUrls.springboot,
      authHeader: "Authorization",
      features: { sso: false, realDb: true },
    },
    {
      id: "aspnetcore",
      label: "ASP.NET Core",
      baseUrl: env.backendBaseUrls.aspnetcore,
      authHeader: "Authorization",
      features: { sso: false, realDb: true },
    },
  ],
};
