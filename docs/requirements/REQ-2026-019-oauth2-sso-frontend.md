# REQ-2026-019 lab 三前端 OAuth 2.0 授权码流改造

| 项 | 值 |
|---|---|
| 提出人 | M01.F05 域收口 |
| 提出日期 | 2026-08-19 |
| 优先级 | P0 |
| 状态 | 已验收 |
| 关联 ADR | — |

## 1. 需求描述

将 lab 三前端（react / nextjs / vue）的 SSO 登录从「自创协议 + ?token= shortcut」升级到
**OAuth 2.0 授权码模式**（RFC 6749 §4.1）。

### 原状（2026-08-18 之前）

- lab `authSsoAuthorize` 收自创字段 `?redirect=...`（不是 OAuth 规范的 `redirect_uri`）
- lab `authSsoCallback` body 用 `{code, state}`（缺 `grant_type` / `client_secret` / `redirect_uri`）
- saas 直接回跳 `?token=...`（token 经 URL 泄漏，首登 localStorage 无 refreshToken 必抛错
  `setSession requires accessToken + user + refreshToken`）
- `state` 写死 `'mock-state'`，无真随机
- `?code=&state=` 路径不验 state，CSRF 漏洞

### 目标（2026-08-19）

完全按 OAuth 2.0 RFC 6749 授权码模式：

- **authorize 端点**收 `{response_type=code, client_id=lab, redirect_uri=<callback>, state=<random>}`
- **callback body** 用 `{grant_type=authorization_code, code, redirect_uri}`
- **client_secret** 仅 lab 后端持有（部署 env，不入 OpenAPI yaml）
- **state** 真随机（crypto.getRandomValues，sessionStorage 缓存），callback 时一次性校验
- **saas token 不出 lab 后端**：lab 后端用 saas id_token 解身份 + 查自家 DB 算 tenant/permissions + 签自家 JWT（LAB_JWT_SECRET）
- **PKCE v1 不加**：client_secret 已足够，留作未来纵深防御

### 澄清记录

| 疑问 | 澄清结论 | 澄清人 | 日期 |
|---|---|---|---|
| PKCE 加不加？ | v1 不加。已有 client_secret 已足，留作未来纵深防御 | — | 2026-08-19 |
| `?token=` shortcut 删还是留？ | 删。不符合 OAuth 2.0 + 首登缺 refreshToken 必崩。saas 改发 `?code=&state=` | — | 2026-08-19 |
| `navigate()` 渲染期副作用？ | React 仓报「Cannot update BrowserRouter while rendering LoginPage」；挪进 `useEffect` 独立 effect | — | 2026-08-19 |
| orval 7.5.0 + axios 1.7 strict-mode 类型不兼容？ | nextjs 仓升级 orval@^7.21.0 + 自定义 mutator `customFetch`（orval.config.ts override.mutator + src/api/mutator/custom-fetch.ts） | — | 2026-08-19 |
| lab 后端 token 怎么签？ | lab 后端 mint 自家 JWT（`LAB_JWT_SECRET`，HS256），saas token 不出 lab 后端 | — | 2026-08-19 |

## 2. 验收标准

| 编号 | 场景（给定） | 操作（当） | 预期（则） |
|---|---|---|---|
| AC-1 | 用户未登录访问 `/login` | 浏览器跳 saas | URL 含 `response_type=code`、`client_id=lab`、`redirect_uri`、`state`；`window.location` 跳到 saas authorizeUrl |
| AC-2 | saas 回跳 `/login?code=xxx&state=yyy` 且 sessionStorage 已预存 `lab.sso.state=yyy` | 浏览器自动 POST callback | body 含 `grant_type=authorization_code` + `code=xxx` + `redirect_uri`；setSession 后跳业务页；sessionStorage `lab.sso.state` 清空 |
| AC-3 | saas 回跳 `/login?code=xxx&state=yyy` 但 state 不匹配 sessionStorage | 浏览器渲染错误提示 | 状态文字「state 校验失败」；sessionStorage `lab.sso.state` 清空；不调 callback；不跳业务页 |
| AC-4 | 单元测试 `tests/features/auth/loginPageSso.dom.test.ts(.tsx)` | vitest run | 2 阶段（authorize + callback）全过；旧 `?token=` 测试已删（路径不存在） |
| AC-5 | lab-msw `sso/authorize` 字段缺失（少 `response_type` / `client_id` / `redirect_uri` / `state`） | MSW node server | 400 `INVALID_REQUEST` |
| AC-6 | lab-msw `sso/callback` 字段缺失或 `grant_type != authorization_code` | MSW node server | 400 `INVALID_REQUEST` / `UNSUPPORTED_GRANT_TYPE` |
| AC-7 | lab-msw `sso/callback` code 第二次调用（一次性防重放） | MSW node server | 400 `INVALID_GRANT` |
| AC-8 | saas-msw `/oauth/authorize` clientId 未注册 | MSW node server | 400 `INVALID_CLIENT` |
| AC-9 | saas-msw `/oauth/token` refresh_token 流转 | MSW node server | 返新 accessToken + 新 refreshToken；旧 refreshToken 失效 |
| AC-10 | lab-shared `generated/openapi/openapi.yaml` 含 OAuth 2.0 字段 | 手查 yaml | `OAuthResponseType` enum=[code]；`OAuthGrantType` enum=[authorization_code]；`SsoCallbackRequest` 含 `grant_type`/`code`/`redirect_uri` |

## 3. 任务拆解

| 任务 ID | 任务描述 | 类型 | 负责人 | 预估 | 状态 |
|---|---|---|---|---|---|
| T-1 | lab-shared tsp 改 ssoAuthorize/ssoCallback OAuth 2.0 字段 + OAuthResponseType/OAuthGrantType enum | 契约 | — | 0.5h | 已完成 |
| T-2 | lab-msw 改 ssoAuthorize/ssoCallback + code 内存映射 + 契约测试 | mock | — | 1h | 已完成 |
| T-3 | saas-msw 实现 /oauth/authorize + /oauth/token + code/refresh 内存映射 + 契约测试 | mock | — | 1h | 已完成 |
| T-4 | lab-react 删 `?token=` 分支 + 修 navigate-in-render + OAuth 2.0 字段调用 + state 校验 + 测试更新 | 前端 | — | 1h | 已完成 |
| T-5 | lab-nextjs 改 `login/page.tsx` OAuth 2.0 + 修 orval mutator（axios 1.7 strict-mode 类型） + 升 orval 7.5→7.21 | 前端 | — | 1.5h | 已完成 |
| T-6 | lab-vue 改 `LoginPage.vue` OAuth 2.0 + 测试更新 | 前端 | — | 1h | 已完成 |

## 4. 功能影响（需求与功能对齐的唯一位置）

> ID 必须存在于 `docs/functions/function-tree.md`。

| 功能 ID | 功能名称 | 影响类型 | 说明 | 关联任务 |
|---|---|---|---|---|
| M01.F05.I03 | SSO OAuth 2.0 授权码流 | 变更 | react/nextjs/vue 三仓 LoginPage 字段 + state CSRF 防护；saas token 不出 lab 后端；旧 `?token=` shortcut 删除 | T-1/T-2/T-3/T-4/T-5/T-6 |

## 5. 流程影响

引用 `docs/design/flow-function-map.md`：

- react 仓：M01.F05.I03 行描述从「SSO 统一登录：跳 saas /login 拿 token 回 /login」改为
  「SSO OAuth 2.0 授权码流：lab /login 无回调 → GET authorize 跳 saas → saas 回跳带 ?code=&state= → POST sso/callback（grant_type=authorization_code，client_secret 仅后端持）→ lab 后端用 saas id_token 解身份 + 签自家 JWT」
- nextjs 仓：同上结构，描述同步
- vue 仓：同上结构，描述同步

## 6. 风险与回滚

| 风险 | 影响面 | 缓解 | 回滚方式 |
|---|---|---|---|
| saas 真后端（springboot/aspnetcore）还没实现 OAuth 2.0 + JWT mint | dev mock 与生产真后端不一致 | 当前 msw mock 与 saas-shared OpenAPI 契约一致；springboot/aspnetcore 真后端实现作为下一 sprint | 暂保留 msw 兜底 dev；生产部署前必须实现真后端 |
| `LAB_JWT_SECRET` 跨环境漂移 | 前后端 JWT 校验失败 | 部署期注入（k8s secret / env），dev 用 `dev-` 前缀默认 | 重新生成 secret + 强制前端重登 |
| orval 升级 7.5→7.21 引入 API 行为差异 | endpoints 客户端调用方式变化 | react/vue 早已 7.21，nextjs 升上去对齐；API 调用方式由 mutator 包装 | 降回 orval@^7.5.0 + 重新跑 gen:shared |
| nextjs 或val mutator `customFetch` 用 `as unknown as Promise<TData>` 绕过类型 | 类型推断失效 | 仅影响返回类型，运行时透传 axios 不变；测试覆盖到 L4 | 改用 `client: 'react-query'` 或预生成 `.d.ts` |
| `state` 一次性校验 + sessionStorage 清掉，但多 tab 打开时其他 tab 也会清 | UX 小问题（其他 tab state 失效） | sessionStorage 默认同 tab 同源共享，多 tab 共享 state 不会破坏 CSRF 防护（state 是 random） | 若用户体验优先可改用 cookie（SameSite=Lax） |