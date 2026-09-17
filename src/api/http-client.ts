// HTTP client — axios + 1:1 endpoint mapping via local orval codegen.
//
// 端点 1:1 映射由 src/api/endpoints/<tag>/<tag>.ts 提供（orval tags-split 形态，
// 按 shared 的 @tag 拆多文件，schemas 抽到 src/api/endpoints/model/）。
// 本文件做两件事：
//   1) 装 axios 拦截器：每次请求从部署期配置（VITE_API_BASE_URL）拿 baseUrl，
//      从 getToken callback 拿 token，写进 Authorization 头
//   2) 提供 ApiError 封装（low-level fetch 走 axios 错误时统一）
//
// ADR-0014：runtime baseUrl 已废弃，改走 env-driven 单 URL。

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "./backend-config";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** 从 axios 错误构造 ApiError（响应体里的 ErrorResponse 直接透传） */
export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<unknown>;
    return new ApiError(axErr.response?.status ?? 0, axErr.response?.data ?? null, axErr.message);
  }
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError(0, null, err.message);
  return new ApiError(0, null, String(err));
}

/**
 * 注入运行时 baseUrl + Bearer token + 401 处理。
 * 在 main.tsx 启动时调一次；getToken 用 callback 形式避免循环依赖。
 *
 * 幂等：拦截器只装一次（ref 单例），重复调用只刷新 getToken/onUnauthorized
 * 回调——避免拦截器叠加导致旧闭包里的过期 token 盖掉新 token。
 *
 * onUnauthorized：任一请求 401 时回调（main.tsx 用它清持久化 token 落
 * anonymous；不在此直接跳路由——FSM 状态变化由 useRequireAuth 守卫消费）。
 */
type UnauthorizedHandler = () => void;
let currentGetToken: () => string | null = () => null;
let currentOnUnauthorized: UnauthorizedHandler | null = null;
let interceptorsInstalled = false;

export function installHttpClient(
  getToken: () => string | null,
  onUnauthorized?: UnauthorizedHandler,
): void {
  currentGetToken = getToken;
  if (onUnauthorized) currentOnUnauthorized = onUnauthorized;
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;

  axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl();
    }
    // 跨源后端（aspnetcore/springboot）的 SSO state cookie 依赖 withCredentials：
    // 没有它，跨源响应的 Set-Cookie 不被存储、后续请求也不携带（RFC 6749 §10.12
    // 的 cookie 校验会因 "missing lab_sso_state cookie" 失败）。同源模式无副作用。
    config.withCredentials = true;
    const token = currentGetToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (
        currentOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        currentOnUnauthorized();
      }
      return Promise.reject(error);
    },
  );
}

// 兼容老调用方：低阶 fetch 包装（仅用于不走 axios 的兜底场景）
export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { getApiBaseUrl, getApiMode } from "./backend-config";