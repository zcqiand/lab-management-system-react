// Sprint 1 fnTest — AuthContext 4 态 FSM（idle → anonymous → awaiting_tenant → authenticated）
// + login/logout/refresh/switchTenant 行为 + TOKEN_STORAGE_KEYS 持久化。
//
// 不启 React：模块级 store 是状态真相，__testActions 直接驱动 FSM。
// axios 用 vi.mock 拦在 orval 生成层（endpoints.ts `import * as axios from 'axios'`）。

import { describe, beforeEach, it, expect, vi } from "vitest";
import { fnTest } from "./fn";

// -- axios mock：可编程响应队列 -------------------------------------------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string; body?: unknown }[] = [];

function ok<T>(data: T): MockResponse {
  return { status: 200, data };
}
function enqueue(...responses: MockResponse[]): void {
  queue.push(...responses);
}

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
  },
}));

// -- localStorage stub（node 环境没有 window）----------------------------------

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  // 语义对齐浏览器：不存在的 key 返回 null（Map.get 是 undefined）
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
});

// SUT 在 mock/stub 声明之后 import（vi.mock 提升，顺位安全）
import {
  hydrateAuth,
  isErrorResponse,
  onAuthChange,
  __testActions as auth,
  __testState,
  __testReset,
} from "../src/state/auth-context";
import { TOKEN_STORAGE_KEYS, BackendId } from "../src/api/contracts";

// -- fixtures --------------------------------------------------------------------

const USER = { id: "u1", username: "admin" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const TENANT_B = { tenantId: "t-b", code: "BETA", name: "乙公司", roleIds: [] };
const LOGIN_1T = { token: "tok-1", refreshToken: "rt-1", user: USER, tenants: [TENANT_A] };
const LOGIN_2T = { token: "tok-2", refreshToken: "rt-2", user: USER, tenants: [TENANT_A, TENANT_B] };

/** 状态回到 idle 后以无 token hydrate → anonymous（各 case 统一起点） */
async function toAnonymous(): Promise<void> {
  __testReset();
  storage.clear();
  await hydrateAuth();
}

/** 排空微任务后读当前状态 */
async function state() {
  await new Promise((r) => setTimeout(r, 0));
  return __testState();
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
});

// -- 契约类型与 key ---------------------------------------------------------------

describe("Sprint 1 前端绑定契约", () => {
  fnTest(["M01.F05.I02"], "TOKEN_STORAGE_KEYS 5 个 key 全部 lab.* 前缀且名字锁死", () => {
    expect(TOKEN_STORAGE_KEYS).toEqual({
      accessToken: "lab.accessToken",
      refreshToken: "lab.refreshToken",
      activeTenantId: "lab.activeTenantId",
      activeBackend: "lab.activeBackend",
      permissionsCache: "lab.permissions",
    });
  });

  it("BackendId 契约 4 槽位锁定（工程设施断言，不挂功能 ID）", () => {
    expect(Object.values(BackendId)).toEqual(
      expect.arrayContaining(["msw", "nextjs", "springboot", "aspnetcore"]),
    );
  });
});

// -- FSM 转移 ----------------------------------------------------------------------

describe("AuthContext FSM", () => {
  fnTest(["M00.F01"], "hydrate 无 token → anonymous", async () => {
    await toAnonymous();
    expect((await state()).kind).toBe("anonymous");
  });

  fnTest(["M00.F01"], "hydrate 有 token → /auth/me 恢复 authenticated 会话", async () => {
    __testReset();
    storage.clear();
    storage.set(TOKEN_STORAGE_KEYS.accessToken, "tok-x");
    storage.set(TOKEN_STORAGE_KEYS.activeTenantId, "t-a");
    enqueue(
      ok({ user: USER, tenants: [TENANT_A, TENANT_B], currentTenantId: "t-a" }),
      ok({ permissions: ["receipt:read"] }),
    );
    await hydrateAuth();
    const s = await state();
    expect(s.kind).toBe("authenticated");
    if (s.kind === "authenticated") {
      expect(s.value.tenant.tenantId).toBe("t-a");
      expect(s.value.user.username).toBe("admin");
    }
  });

  fnTest(["M01.F05.I01"], "login 单租户 → 直进 authenticated + token 双 key 持久化", async () => {
    await toAnonymous();
    enqueue(ok(LOGIN_1T), ok({ permissions: [] }));
    const resp = await auth.login({ username: "admin", password: "x" });
    expect(isErrorResponse(resp)).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken)).toBe("tok-1");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.refreshToken)).toBe("rt-1");
    expect((await state()).kind).toBe("authenticated");
    expect(calls[0]?.url).toContain("/api/auth/login");
  });

  fnTest(["M01.F05.I01"], "login 失败 → 停在 anonymous，ErrorResponse 返回", async () => {
    await toAnonymous();
    enqueue({ status: 401, data: { code: "BAD_CREDENTIALS", message: "wrong" } });
    const resp = await auth.login({ username: "admin", password: "bad" });
    expect(isErrorResponse(resp)).toBe(true);
    expect((await state()).kind).toBe("anonymous");
  });

  fnTest(["M00.F02"], "login 多租户 → awaiting_tenant 携带 tenants 候选", async () => {
    await toAnonymous();
    enqueue(ok(LOGIN_2T));
    await auth.login({ username: "admin", password: "x" });
    const s = await state();
    expect(s.kind).toBe("awaiting_tenant");
    if (s.kind === "awaiting_tenant") {
      expect(s.value.tenants.map((t) => t.tenantId)).toEqual(["t-a", "t-b"]);
    }
  });

  fnTest(["M00.F02"], "switchTenant 在 anonymous 态调用 → WRONG_STATE", async () => {
    await toAnonymous();
    const resp = await auth.switchTenant({ tenantId: "t-a" });
    expect(isErrorResponse(resp)).toBe(true);
    if (isErrorResponse(resp)) expect(resp.code).toBe("WRONG_STATE");
  });

  fnTest(["M00.F02"], "awaiting_tenant --switchTenant--> authenticated + activeTenantId 记忆", async () => {
    await toAnonymous();
    enqueue(ok(LOGIN_2T), ok(LOGIN_1T), ok({ permissions: [] }));
    await auth.login({ username: "admin", password: "x" }); // → awaiting_tenant
    const resp = await auth.switchTenant({ tenantId: "t-a" });
    expect(isErrorResponse(resp)).toBe(false);
    expect((await state()).kind).toBe("authenticated");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.activeTenantId)).toBe("t-a");
  });

  fnTest(["M01.F05.I04"], "logout → anonymous + 全部持久化 key 清空", async () => {
    await toAnonymous();
    enqueue(ok(LOGIN_1T), ok({ permissions: [] }));
    await auth.login({ username: "admin", password: "x" });
    await auth.logout();
    expect((await state()).kind).toBe("anonymous");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken)).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.refreshToken)).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.activeTenantId)).toBeNull();
  });

  fnTest(["M01.F05.I02"], "token 失效（me 401 + refresh 401）→ 退 anonymous + 清 token", async () => {
    __testReset();
    storage.clear();
    storage.set(TOKEN_STORAGE_KEYS.accessToken, "stale");
    storage.set(TOKEN_STORAGE_KEYS.refreshToken, "stale-rt");
    enqueue(
      { status: 401, data: { code: "UNAUTHORIZED", message: "expired" } }, // me
      { status: 401, data: { code: "UNAUTHORIZED", message: "expired" } }, // refresh
    );
    await hydrateAuth();
    expect((await state()).kind).toBe("anonymous");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken)).toBeNull();
  });

  fnTest(["M01.F05.I02"], "onChange 契约：状态转移触发订阅 + unsub 停止", async () => {
    await toAnonymous();
    const seen: string[] = [];
    const unsub = onAuthChange((s) => seen.push(s.kind));
    enqueue(ok(LOGIN_1T), ok({ permissions: [] }));
    await auth.login({ username: "admin", password: "x" });
    unsub();
    await auth.logout();
    expect(seen).toContain("authenticated");
    expect(seen.lastIndexOf("authenticated")).toBeGreaterThan(seen.indexOf("anonymous"));
    // logout 之后 unsub 生效：不再追加
    const lenAtUnsub = seen.length;
    await auth.logout();
    expect(seen.length).toBe(lenAtUnsub);
  });
});

// -- permissions / hasPermission -----------------------------------------------------

describe("AuthContext permissions", () => {
  fnTest(["M01.F04.I02"], "authenticated 态拉取 /auth/permissions 并供 hasPermission 判断", async () => {
    await toAnonymous();
    enqueue(ok(LOGIN_1T), ok({ permissions: ["report:approve", "receipt:read"] }));
    await auth.login({ username: "admin", password: "x" });
    expect(calls.some((c) => c.url.includes("/api/auth/permissions"))).toBe(true);
    expect(auth.hasPermission("report:approve")).toBe(true);
    expect(auth.hasPermission("report:reject")).toBe(false);
  });

  fnTest(["M01.F04.I02"], "非 authenticated 态 hasPermission 恒 false", async () => {
    await toAnonymous();
    expect(auth.hasPermission("report:approve")).toBe(false);
  });
});
