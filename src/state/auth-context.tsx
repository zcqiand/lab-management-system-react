"use client";

// AuthContext — Sprint 1 前端绑定契约的 React 实现。
//
// 契约（shared tsp/contracts/frontend-bind.tsp，TS 签名见 .state/decision-log.md §2.2）：
//   AuthState 4 态 FSM: idle → anonymous → awaiting_tenant → authenticated
//   行为: login / logout / refresh / switchTenant / hasPermission / onChange
//
// 实现要点：
//   - 状态真相是模块级 store（setState + listener 列表），React Context 是它的视图层。
//     onChange 契约不依赖 React 生命周期，测试里可以脱离 <AuthProvider> 直接用。
//   - FSM 转移（decision-log open_questions 留白，这里落成可测的显式表）：
//       idle        --hydrate()-->            anonymous | authenticated
//       anonymous   --login() 成功-->          awaiting_tenant（多租户）| authenticated（单租户）
//       awaiting_tenant --switchTenant()-->    authenticated
//       authenticated --switchTenant()-->      awaiting_tenant（换租户走契约同路径）
//       *           --logout()-->              anonymous
//       authenticated --refresh() 401-->       anonymous
//   - 持久化 key 全部来自 TOKEN_STORAGE_KEYS 契约常量（lab.*）。
//   - permissions 缓存 TTL 5 分钟（decision-log §4 风险表约定），
//     switchTenant / logout 主动失效。

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authGetCurrentUser,
  authGetPermissions,
  authLogin,
  authLogout,
  authRefresh,
  authSwitchTenant,
} from "@/api/endpoints/endpoints";
import type {
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  MyTenant,
} from "@/api/endpoints/endpoints.schemas";
import {
  TOKEN_STORAGE_KEYS,
  type AuthState,
  type UnsubscribeFn,
} from "@/api/contracts";
import { toApiError } from "@/api/http-client";

// ---------------------------------------------------------------------------
// 模块级 store — 状态真相
// ---------------------------------------------------------------------------

const IDLE: AuthState = { kind: "idle", value: { kind: "idle" } };
const ANON: AuthState = { kind: "anonymous", value: { kind: "anonymous" } };

const PERMISSIONS_TTL_MS = 5 * 60 * 1000;

interface Store {
  state: AuthState;
  listeners: Set<(s: AuthState) => void>;
}

const store: Store = { state: IDLE, listeners: new Set() };

function setState(next: AuthState): void {
  store.state = next;
  for (const l of store.listeners) l(next);
}

function subscribe(handler: (s: AuthState) => void): UnsubscribeFn {
  store.listeners.add(handler);
  return () => store.listeners.delete(handler);
}

// -- localStorage 读写（key 名锁在 TOKEN_STORAGE_KEYS）-----------------------

// 存储介质探测：优先 window.localStorage（浏览器），node 测试环境退裸 localStorage 全局。
// 与其判 window 不如直接探测介质本身 — SSR / vitest node env 都能走对。
function storageOf(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // 访问 localStorage 本身抛异常（隐私模式）— 视为不可用
  }
  return null;
}

function readKey(key: string): string | null {
  const s = storageOf();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}
function writeKey(key: string, value: string | null): void {
  const s = storageOf();
  if (!s) return;
  try {
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // 隐私模式等场景 localStorage 不可用 — 静默降级为会话内状态
  }
}

function persistTokens(resp: LoginResponse): void {
  writeKey(TOKEN_STORAGE_KEYS.accessToken, resp.token);
  if (resp.refreshToken) writeKey(TOKEN_STORAGE_KEYS.refreshToken, resp.refreshToken);
  else writeKey(TOKEN_STORAGE_KEYS.refreshToken, null);
}

function clearPersisted(): void {
  for (const key of Object.values(TOKEN_STORAGE_KEYS)) writeKey(key, null);
}

// -- authenticated 态所需 permissions 缓存 ------------------------------------
// 独立于 AuthState（契约里 permissions 在 state 内），缓存层是纯优化：
// TTL + 主动失效（switchTenant/logout）。state.permissions 仍是判断源。

let permissionsCache: { value: string[]; fetchedAt: number } | null = null;

function invalidatePermissions(): void {
  permissionsCache = null;
  writeKey(TOKEN_STORAGE_KEYS.permissionsCache, null);
}

async function fetchPermissions(token: string): Promise<string[]> {
  if (permissionsCache && Date.now() - permissionsCache.fetchedAt < PERMISSIONS_TTL_MS) {
    return permissionsCache.value;
  }
  const resp = await authGetPermissions({
    headers: { Authorization: `Bearer ${token}` },
  });
  const value: string[] = resp.data.permissions ?? [];
  permissionsCache = { value, fetchedAt: Date.now() };
  writeKey(TOKEN_STORAGE_KEYS.permissionsCache, JSON.stringify(value));
  return value;
}

// -- FSM 动作（模块级，Context 只是暴露）--------------------------------------

function isErrorResponse(v: unknown): v is ErrorResponse {
  return typeof v === "object" && v !== null && "code" in v && "message" in v;
}

/** login 成功后的共同落位：单租户直进 authenticated，多租户进 awaiting_tenant */
async function settleLogin(resp: LoginResponse): Promise<void> {
  persistTokens(resp);
  const tenantId = readKey(TOKEN_STORAGE_KEYS.activeTenantId);
  const tenants: MyTenant[] = resp.tenants ?? [];
  const remembered = tenants.find((t) => t.tenantId === tenantId);
  const single = tenants.length === 1 ? tenants[0] : undefined;
  const target = remembered ?? single;
  if (target) {
    writeKey(TOKEN_STORAGE_KEYS.activeTenantId, target.tenantId);
    const permissions = await fetchPermissions(resp.token).catch(() => [] as string[]);
    setState({
      kind: "authenticated",
      value: {
        kind: "authenticated",
        user: resp.user,
        tenant: target,
        permissions,
        tokenExpiresAt: Date.now() + 30 * 60 * 1000,
      },
    });
  } else {
    setState({
      kind: "awaiting_tenant",
      value: { kind: "awaiting_tenant", user: resp.user, tenants },
    });
  }
}

async function doLogin(req: LoginRequest): Promise<LoginResponse | ErrorResponse> {
  try {
    const resp = await authLogin(req);
    await settleLogin(resp.data);
    return resp.data;
  } catch (err) {
    return { code: "LOGIN_FAILED", message: toApiError(err).message };
  }
}

/**
 * 直接 setSession（不走 /api/auth/login）：
 * saas post-login 跳回 lab 时带 ?token=...&state=...，把 token 写 localStorage +
 * 推到 authenticated 态。这是 SSO callback 路径，与本地账号密码 login 并列。
 *
 * 取 partial LoginResponse：saas 已经换好 token 的话只带 token + user + tenants
 * （缺 refreshToken / currentTenantId 时用 readKey 兜底）。
 */
async function doSetSession(
  partial: { accessToken: string; refreshToken?: string; user?: LoginResponse["user"]; tenants?: LoginResponse["tenants"] },
): Promise<void> {
  // refreshToken / user / tenants 兜底
  const refreshToken =
    partial.refreshToken ?? readKey(TOKEN_STORAGE_KEYS.refreshToken);
  const user = partial.user;
  const tenants = partial.tenants ?? [];
  if (!refreshToken || !user) {
    throw new Error("setSession requires accessToken + user + refreshToken");
  }
  // 优先单租户直进 authenticated；多租户走 awaiting_tenant。settleLogin 内部判断。
  const fullResp: LoginResponse = {
    token: partial.accessToken,
    refreshToken,
    user,
    tenants,
  };
  await settleLogin(fullResp);
}

async function doLogout(): Promise<void> {
  const token = readKey(TOKEN_STORAGE_KEYS.accessToken);
  if (token) {
    await authLogout({ token }).catch(() => undefined);
  }
  clearPersisted();
  invalidatePermissions();
  setState(ANON);
}

async function doRefresh(): Promise<LoginResponse | ErrorResponse> {
  const refreshToken = readKey(TOKEN_STORAGE_KEYS.refreshToken);
  if (!refreshToken) {
    setState(ANON);
    return { code: "NO_REFRESH_TOKEN", message: "无 refreshToken，退回匿名态" };
  }
  try {
    const resp = await authRefresh({ refreshToken });
    await settleLogin(resp.data);
    return resp.data;
  } catch {
    // 契约：401 时退到 anonymous
    clearPersisted();
    invalidatePermissions();
    setState(ANON);
    return { code: "REFRESH_FAILED", message: "刷新失败，退回匿名态" };
  }
}

async function doSwitchTenant(
  req: import("@/api/endpoints/endpoints.schemas").SwitchTenantRequest,
): Promise<LoginResponse | ErrorResponse> {
  if (store.state.kind !== "awaiting_tenant" && store.state.kind !== "authenticated") {
    return { code: "WRONG_STATE", message: "switchTenant 仅在 awaiting_tenant / authenticated 态可调" };
  }
  try {
    const resp = await authSwitchTenant(req);
    writeKey(TOKEN_STORAGE_KEYS.activeTenantId, req.tenantId);
    invalidatePermissions();
    await settleLogin(resp.data);
    return resp.data;
  } catch (err) {
    return { code: "SWITCH_TENANT_FAILED", message: toApiError(err).message };
  }
}

function currentPermissions(): string[] {
  return store.state.kind === "authenticated" ? store.state.value.permissions : [];
}

function doHasPermission(perm: string): boolean {
  return currentPermissions().includes(perm);
}

// -- hydrate：App mount 时把 localStorage 恢复成 authenticated ------------------

/** 从持久化 token 恢复会话；无 token 落 anonymous。仅 mount 时调一次。 */
export async function hydrateAuth(): Promise<void> {
  if (store.state.kind !== "idle") return;
  const token = readKey(TOKEN_STORAGE_KEYS.accessToken);
  if (!token) {
    setState(ANON);
    return;
  }
  try {
    const resp = await authGetCurrentUser({
      headers: { Authorization: `Bearer ${token}` },
    });
    const session = resp.data;
    const tenantId = readKey(TOKEN_STORAGE_KEYS.activeTenantId) ?? session.currentTenantId ?? undefined;
    const tenant = session.tenants.find((t) => t.tenantId === tenantId);
    if (tenant) {
      writeKey(TOKEN_STORAGE_KEYS.activeTenantId, tenant.tenantId);
      const permissions = await fetchPermissions(token).catch(() => [] as string[]);
      setState({
        kind: "authenticated",
        value: {
          kind: "authenticated",
          user: session.user,
          tenant,
          permissions,
          tokenExpiresAt: Date.now() + 30 * 60 * 1000,
        },
      });
    } else {
      setState({
        kind: "awaiting_tenant",
        value: { kind: "awaiting_tenant", user: session.user, tenants: session.tenants },
      });
    }
  } catch {
    // token 已失效 — 静默刷新一次，仍失败落 anonymous
    await doRefresh();
  }
}

// ---------------------------------------------------------------------------
// React Context 视图层
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  state: AuthState;
  login: (req: LoginRequest) => Promise<LoginResponse | ErrorResponse>;
  /** 直接 setSession：SSO 跳回带 ?token= 时用（不走 /api/auth/login） */
  setSession: (
    partial: Partial<LoginResponse> & { accessToken: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<LoginResponse | ErrorResponse>;
  switchTenant: (
    req: import("@/api/endpoints/endpoints.schemas").SwitchTenantRequest,
  ) => Promise<LoginResponse | ErrorResponse>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setStateReact] = useState<AuthState>(store.state);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsub = subscribe(setStateReact);
    void hydrateAuth();
    return () => {
      unsub();
      mounted.current = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: doLogin,
      setSession: doSetSession,
      logout: doLogout,
      refresh: doRefresh,
      switchTenant: doSwitchTenant,
      hasPermission: doHasPermission,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** 契约 onChange 的裸暴露（测试 / 非 React 消费方用） */
export const onAuthChange = subscribe;

export { isErrorResponse };

// -- 测试专用入口：模块级行为函数 + 当前状态读取 -------------------------------
// authLogin 等走 axios，测试在 vitest 里 vi.mock("axios") 即可拦住；
// 这些导出让 node 环境测试无需 React 树就能驱动 FSM。

export const __testActions = {
  login: doLogin,
  logout: doLogout,
  refresh: doRefresh,
  switchTenant: doSwitchTenant,
  hasPermission: doHasPermission,
};

export function __testState(): AuthState {
  return store.state;
}

export function __testReset(): void {
  store.state = IDLE;
  store.listeners.clear();
  permissionsCache = null;
}
