# lab-management-system-react Architecture

> 本仓的架构真相源。回答三个问题：
> 1. 仓是什么角色、为什么这样定位；
> 2. 目录长什么样、谁负责什么；
> 3. 一次"改契约 → 三前端同步"的核心流程在本仓怎么走。
>
> **范围**：本文档只描述 *架构*（结构 / 边界 / 数据流 / 决策）。
> 编码细则见 [docs/conventions/](conventions/)，单个决策的 ADR 见 [docs/adr/](adr/)，产品需求见 [docs/requirements/](requirements/)。
>
> 父仓全景见 [`../../../docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md)；仓入口见 [`../CLAUDE.md`](../CLAUDE.md)。

---

## 0. 阅读路径

| 你是… | 直接看 |
|---|---|
| 新人，要 30 分钟搞懂本仓 | §1 → §2 → §3（API 层 → state → 页面） |
| 想加新页面 / 新业务模块 | §3 → §4（开发流程）→ [docs/conventions/sprint-roadmap.md](conventions/sprint-roadmap.md) |
| 想加新接口（动契约） | §4.1（gen-shared 链）→ 父仓 [§3.2](../../../docs/ARCHITECTURE.md) → [docs/adr/0003-function-tree-requires-human-approval.md](../../../docs/adr/0003-function-tree-requires-human-approval.md) |
| 跨端调不通（401 / CORS / 拿不到数据） | §5（v0.3.0 基建）→ 父仓 [§3.5/§6](../../../docs/ARCHITECTURE.md) → memory/orval-axios-baseurl-must-be-installed.md |
| 想问"为什么这样设计" | §6（决策索引）→ 对应 ADR |

---

## 1. 角色与定位

**本仓 = lab 家族的 react-ts 前端仓**：

- 消费 [`../lab-management-system-shared/generated/openapi/openapi.yaml`](../../lab-management-system-shared/generated/openapi/openapi.yaml)（TypeSpec emit 产物）作为 API 契约唯一真源；
- 通过 **orval** codegen 出 `src/api/endpoints/endpoints.ts` 具名函数（react-query 形态）；
- 通过 **axios 拦截器** + **`installHttpClient`** bootstrap 注入 baseURL / Authorization；
- **不实现任何 `/api` route**（[ADR-0001](#6-决策索引)），后端由 lab-msw / lab-nextjs / 未来 springboot / aspnetcore 提供；
- 26 页 UI（22 业务 + 4 工具页）镜像自 [`../lab-management-system-nextjs/src/app/`](../../lab-management-system-nextjs/src/app/)。

### 1.1 仓在三仓前端里的位置

```
lab-management-system-shared/   ← 契约源（TypeSpec → openapi.yaml）
        │
        ▼
lab-management-system-msw/      ← mock 后端（:5200，ADR-0012 B 强度；端口分段 conventions §6）
        │ (HTTP)
        ▼
lab-management-system-react/    ← 本仓：React 19 + Vite + axios（5202 dev server / 跨源）
lab-management-system-vue/      ← vue-ts（5202 dev server / 跨源）
lab-management-system-nextjs/   ← nextjs App Router + 兼 schema emit infra（3000 跨源）
```

**本仓不是家族全栈后端**——saas-nextjs 兼任全栈（父仓 [§4.3](../../../docs/ARCHITECTURE.md)），但 lab-nextjs **不兼**后端，只在前端壳里同步共享契约仓。

### 1.2 技术栈

| 维度 | 选择 | 备注 |
|---|---|---|
| 框架 | React 19 + TypeScript | 函数组件 + Hooks（禁 class） |
| 构建 | Vite 5 | dev 默认 :5202 |
| 路由 | react-router-dom v6 | layout route + `<Outlet />` |
| HTTP | axios + orval codegen | baseURL 走 env，token 走 interceptor |
| 状态 | React Context（auth FSM） + 模块级 store | Zustand 未引入；SSO 跳板场景要求 FSM 可在非 React 树里驱动 |
| UI | shadcn/ui（`src/components/ui/`）+ Tailwind v4 | 禁裸颜色（`bg-[#..]`）；只用语义 token |
| 测试 | Vitest + Testing Library | fnTest 嵌 fn-ID |
| Lint | ESLint + Prettier | L2/L1 门禁 |

### 1.3 关键约束速查

> 完整约束见 [`../CLAUDE.md`](../CLAUDE.md) §2。本表是"忘命时一瞥"版。

| 类别 | 禁令 | 后果 |
|---|---|---|
| 数据获取 | 禁组件里直接 fetch | 走 `src/api/` 层（orval 具名函数或 legacy-client） |
| 数据获取 | 禁运行时切后端 / 禁 BackendSwitcher | ADR-0014；只走 env |
| 类型 | 禁 `any` / `@ts-ignore`（除非附 ADR） | L2 失败 |
| 样式 | 禁内联样式对象承载布局 / 禁裸颜色 | L2 失败 |
| UI | 禁手写 button/input/table/modal | 必须用 `src/components/ui/` 原语 |
| 业务页 | 禁各写标题栏/分页/空态 | 必须用 `src/components/app/` 复合原语 |
| 反馈 | 禁 `window.confirm` / `window.alert` | 走 ConfirmDialog + sonner |
| 持久化 | 禁 localStorage 直接散落 | 统一走 `src/state/` + `TOKEN_STORAGE_KEYS` 契约 |
| 跨仓 | 禁 `@lab/management-system-shared` import TS 客户端 | shared 仓只产 OpenAPI.yaml |
| 跨仓 | 禁复制 saas-react 组件源码 | lab 自己写 |

---

## 2. 目录骨架

```
lab-management-system-react/
├── CLAUDE.md                          ← 入口：技术栈 + 禁令 + 指向别处
├── .harness/stack.json                ← 仓自描述（suite 门禁读它）
├── docs/
│   ├── functions/function-tree.md     ← F/I 级功能清单（BASE 24 + 子项）
│   ├── adr/                           ← 本仓特有 ADR
│   ├── design/                        ← 流程/设计（人评审）
│   ├── requirements/                  ← 需求 → 任务 → 功能影响
│   └── conventions/                   ← 编码细则（env/app-ui/sprint-roadmap/react-perf）
├── scripts/
│   └── gen-shared.ts                  ← npm run gen:shared（orval 入口）
├── src/
│   ├── main.tsx                       ← bootstrap：installHttpClient + installLegacyClient + <AuthProvider>
│   ├── App.tsx                        ← react-router 入口（login 公共 + AppShell layout route）
│   ├── index.css                      ← Tailwind v4 + 语义 token（禁裸颜色）
│   ├── vite-env.d.ts
│   ├── api/
│   │   ├── env.ts → backend-config.ts → http-client.ts → contracts.ts → legacy-client.ts
│   │   └── endpoints/
│   │       ├── endpoints.ts           ← orval codegen（gitignored，react-query 形态）
│   │       └── endpoints.schemas.ts   ← orval codegen（contract 类型 re-export 锚点）
│   ├── state/
│   │   ├── auth-context.tsx           ← AuthProvider + useAuth + FSM 4 态（idle/anonymous/awaiting_tenant/authenticated）
│   │   └── require-auth.ts            ← useRequireAuth 守卫
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui 原语（button/input/table/dialog/...）
│   │   ├── app/                       ← 复合原语（AppShell/SidebarNav/BackendBadge/PageHeader/DataTable/...）
│   │   └── ConfirmModal.tsx           ← ConfirmDialog 落地版
│   ├── pages/                         ← 26 个 F.I 页面（lazy import）
│   ├── features/                      ← 镜像自 lab-nextjs 的 features 层（业务组件 + dialog/modal）
│   ├── lib/                           ← env / responses / utils / sanitize-redirect
│   ├── types/                         ← 仓内私有类型（非契约 codegen）
│   └── data/                          ← 模板清单（生成产物豁免，见 ADR-0001）
├── tests/                             ← Vitest + fnTest 嵌 fn-ID
├── orval.config.ts                    ← 读 ../shared/generated/openapi/openapi.yaml
├── package.json                       ← devDep: orval; runtime: axios + react/router
├── vite.config.ts / vitest.config.ts
├── nginx.conf                         ← prod 构建反向代理 /api/*
├── Dockerfile                         ← nginx 静态构建
└── .env.example / .env.local          ← env 模板 / gitignored 本地私有
```

**与父仓 [§2.3](../../../docs/ARCHITECTURE.md) 对照**：本仓是 react-ts 前端变体，`src/api/` / `src/components/` / `src/pages/` / `src/state/` / `src/lib/` 是 Vite 专属命名（lab-vue 是 `src/api/` + `src/components/` + `src/views/` + `src/stores/`；lab-nextjs 是 `src/app/` + `src/components/`）。

---

## 3. 核心模块

### 3.1 src/api/ — 数据获取层

| 文件 | 角色 | 入口函数 |
|---|---|---|
| `lib/env.ts` | env 集中读取（带默认值） | `env.apiBaseUrl` / `env.apiMode` / `env.saasBaseUrl` |
| `api/backend-config.ts` | env → 后端 URL getter | `getApiBaseUrl()` / `getApiMode()` |
| `api/http-client.ts` | axios 拦截器 + ApiError 封装 | `installHttpClient(getToken)` / `toApiError(err)` / `apiRequest()` |
| `api/endpoints/endpoints.ts` | orval codegen 产物（react-query 形态） | `authLogin` / `authGetCurrentUser` / `authGetPermissions` / `authGetMenus` / ... |
| `api/endpoints/endpoints.schemas.ts` | orval codegen（contract 类型 re-export） | `AuthState` / `BackendId` / `MenuNode` / ... |
| `api/contracts.ts` | 仓内契约常量 + 4 槽位默认注册表（ADR-0014 信息性保留） | `TOKEN_STORAGE_KEYS` / `BACKEND_REGISTRY_DEFAULT` |
| `api/legacy-client.ts` | 镜像页数据获取（`apiClient` + `API_ROUTES`，详见 [§5.2](#52-legacy-client--镜像页数据获取-v0x-入口)） | `installLegacyClient(tokenSource, onUnauthorized)` / `apiClient` / `API_ROUTES` |

**数据获取双轨**：

1. **orval 轨**（新代码默认）：`import { authLogin } from "@/api/endpoints/endpoints"` — react-query 形态、`useXxx` hooks、`signal: true` 支持取消；
2. **legacy-client 轨**（镜像页用）：`apiClient.get(API_ROUTES['/contracts'])` — 1:1 镜像 nextjs features 层，Sprint 3+ 规划归一。

### 3.2 src/state/ — 状态层

**模块组成**：

- `auth-context.tsx` — AuthProvider + useAuth + 4 态 FSM（`idle → anonymous → awaiting_tenant → authenticated`）。契约签名见 [shared/tsp/contracts/frontend-bind.tsp](../../lab-management-system-shared/tsp/contracts/frontend-bind.tsp)。
- `require-auth.ts` — `useRequireAuth()` 守卫；AppShell 内部调用，业务子路由不再各自守卫。

**关键设计**：状态真相是**模块级 store**（`store.state` + `setState` + listener 列表），React Context 只是它的视图层。这意味着：

- `onChange(handler)` 契约可在 vitest 里脱离 `<AuthProvider>` 直接驱动（`__testActions` / `__testState` / `__testReset`）；
- permissions 缓存 TTL 5 分钟（`PERMISSIONS_TTL_MS = 5 * 60 * 1000`），`switchTenant` / `logout` 主动失效；
- 持久化 key **全部**来自 `TOKEN_STORAGE_KEYS` 契约常量（`lab.accessToken` / `lab.refreshToken` / `lab.activeTenantId` / `lab.activeBackend` / `lab.permissions`）——禁裸字符串 localStorage。

**FSM 转移表**：

| 当前态 | 动作 | 下一态 |
|---|---|---|
| `idle` | `hydrateAuth()`（mount 时） | `anonymous`（无 token）/ `authenticated`（token 有效）/ `awaiting_tenant`（多租户） |
| `anonymous` | `login()` 成功 | `authenticated`（单租户）/ `awaiting_tenant`（多租户） |
| `awaiting_tenant` | `switchTenant()` | `authenticated` |
| `authenticated` | `switchTenant()` | `awaiting_tenant`（换租户走契约同路径） |
| `*` | `logout()` | `anonymous` |
| `authenticated` | `refresh()` 401 | `anonymous` |

### 3.3 src/components/ — UI 层

| 子目录 | 角色 | 入口 |
|---|---|---|
| `ui/` | shadcn/ui 原语（不可改结构） | `button.tsx` / `input.tsx` / `table.tsx` / `dialog.tsx` / `select.tsx` / `sonner.tsx` / ... |
| `app/` | 复合原语（业务页通用件） | `app-shell.tsx` / `sidebar-nav.tsx` / `page-header.tsx` / `data-table.tsx` / `pagination-bar.tsx` / `empty-state.tsx` / `field.tsx` / `confirm-dialog.tsx` / `backend-badge.tsx` / `bad-path-redirect.tsx` / `menus.ts` |
| `ConfirmModal.tsx` | ConfirmDialog 落地版 | （仓根目录，防命名混淆） |

**约束**：

- 禁手写 button/input/table/modal 样式 → 一律用 `ui/` 原语；
- 禁各业务页各写标题栏/分页/空态 → 一律用 `app/` 复合原语；
- 禁运行时切后端 → `BackendBadge` 只显示 `apiMode` + `baseUrl`（无切换交互）；
- 禁裸颜色 → `bg-[#..]` / 原始 hex 一律禁；只用 `index.css` 语义 token。

### 3.4 src/pages/ — 路由层（26 个 F.I 入口）

所有页面用 `React.lazy(() => import("@/pages/XxxPage"))` 异步加载（首屏不阻塞）；路由表见 [`App.tsx`](../src/App.tsx)。

**按功能模块分组**（`function-tree.md` 映射）：

| 模块 | 页面 | 路由 | 功能 ID |
|---|---|---|---|
| **M01 认证** | `LoginPage.tsx` | `/login`（公共，不带 AppShell） | M01.F05 |
| **M00 仪表盘** | `DashboardPage.tsx` | `/`（AppShell 内 index） | M00.F01 |
| **M02 合同** | `ContractsPage.tsx` | `/contracts` | M02.F01 |
| **M03 试验过程** | `ReceiptsPage.tsx` | `/receipts` | M03.F01 |
| | `ReceiptDetailPage.tsx` | `/receipts/:id` | M03.F09 |
| | `TaskAssignmentPage.tsx` | `/task-assignment` | M03.F02 |
| | `DataEntryPage.tsx` | `/data-entry` | M03.F03 |
| | `ReportReviewPage.tsx` | `/report-review` | M03.F05 |
| | `ReportApprovePage.tsx` | `/report-approve` | M03.F06 |
| | `ReportIssuePage.tsx` | `/report-issue` | M03.F07 |
| | `ReportArchivePage.tsx` | `/report-archive` | M03.F08 |
| **M04 基础数据** | `ModelsPage.tsx` | `/models` | M04.F06 |
| | `SpecificationsPage.tsx` | `/specifications` | M04.F07 |
| | `GradesPage.tsx` | `/grades` | M04.F08 |
| | `BrandsPage.tsx` | `/brands` | M04.F09 |
| **M05 数据统计** | `SummaryPage.tsx` | `/summary` | M05.F01 |
| **M06 检测能力** | `SpecialtiesPage.tsx` | `/inspection-specialties` | M06.F01 |
| | `ObjectsPage.tsx` | `/inspection-objects` | M06.F02 |
| | `ParametersPage.tsx` | `/inspection-parameters` | M06.F03 |
| | `StandardsPage.tsx` | `/inspection-standards` | M06.F04 |
| | `CalculationMethodsPage.tsx` | `/inspection-calculation-methods` | M06.F05 |
| | `TechnicalRequirementsPage.tsx` | `/inspection-technical-requirements` | M06.F06 |
| | `ReportNamesPage.tsx` | `/report-names` | M06.F07 |
| | `ParamInterfacesPage.tsx` | `/param-interfaces` | M06.F08 |

**布局路由**：

```
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />          ← 公共页（无 AppShell）
    <Route element={<AppShell />}>                            ← layout route
      <Route index element={<DashboardPage />} />
      {/* 22 条业务子路由（lazy import） */}
      <Route path="contracts" element={<RouteSuspense><ContractsPage /></RouteSuspense>} />
      {/* ... */}
    </Route>
    <Route path="*" element={<BadPathRedirect />} />          ← 兜底 404
  </Routes>
</BrowserRouter>
```

### 3.5 src/features/ — 镜像业务层

镜像自 [`../lab-management-system-nextjs/src/features/`](../../lab-management-system-nextjs/src/features/)，含 9 个子目录：

```
src/features/
├── contracts/              ← 合同管理（dialog/modal/form/list 组件）
├── data-entry/             ← 样品 + 检测数据录入
├── dicts/                  ← 基础数据码表（4 主表 + 4 junction link）
├── inspection-capability/  ← M06 检测能力 10 组件
├── param-interfaces/       ← 参数界面
├── receipts/               ← 接样 + 详情 + 流程历史
├── report-names/           ← 报告名称 + extFields 模板
├── reports/                ← 报告 4 阶段（review/approve/issue/archive）
├── summary/                ← 报告汇总表 + 仪表盘
└── task-assignment/        ← 任务分配队列
```

**镜像不照搬**：

- nextjs 的 `next/navigation` → react-router-dom 的 `useLocation`/`useNavigate`；
- nextjs 的 `useSaasApp` → 静态 `appName` 传入；
- 数据获取保持 `apiClient` + `API_ROUTES`（详见 [§5.2](#52-legacy-client--镜像页数据获取-v0x-入口)）；
- `?menu=` 机制不搬（react 选中态按 `location.pathname` 匹配）。

### 3.6 src/lib/ — 工具层

| 文件 | 角色 |
|---|---|
| `env.ts` | env 集中读取（带默认值 + 未设 vs 空串区分） |
| `responses.ts` | 响应处理工具 |
| `utils.ts` | `cn()`（clsx + tailwind-merge） |
| `sanitize-redirect.ts` | SSO callback redirect URL 净化 |

---

## 4. 核心流程

### 4.1 dev 模式（msw-http 默认）

```
1. 启动 mock 后端:
   cd ../lab-management-system-msw && npm start
   → http://localhost:5200
   → GET /healthz → { mode: "msw" }

2. 启动前端:
   npm run dev
   → http://localhost:5200（同源）

3. 浏览器调 API:
   页 import { authGetCurrentUser } from "@/api/endpoints/endpoints"
   → 或 apiClient.get(API_ROUTES['/contracts'])（legacy 轨）
   → http-client.ts::installHttpClient 拦截器：
     - baseURL = env.apiBaseUrl (= "http://localhost:5200"，.env.example 默认)
     - Authorization: Bearer <localStorage.lab.accessToken>
   → fetch → :5200/api/v1/auth/me → msw-handlers 拦截 → 返回 JSON fixture

4. 切真后端（开发后期 / 集成测试）:
   .env.local 改 VITE_API_BASE_URL=http://localhost:5205（springboot）
   重启 vite（env 启动期注入）
   → axios 走绝对 URL 直连 springboot
   → springboot 调 shared SQL 灌过的 lab_dev DB
```

**关键检查点**：

- `main.tsx` bootstrap **必须**调 `installHttpClient()`——否则 prod 永远走同 origin 被 nginx 405（`memory/orval-axios-baseurl-must-be-installed.md`）；
- `baseURL` 是 root URL，**不带 `/api/v1` 前缀**——path 自带，baseURL 别加（`memory/axios-baseurl-no-path-prefix.md`）；
- 改 env 后必须**重启 vite**（Vite 在启动 phase 注入 env，运行时改 env 不生效）；
- 后端 CORS allowlist 必须含 3000（nextjs dev 跨源），否则 preflight 莫名失败（父仓 [§3.5](../../../docs/ARCHITECTURE.md)）；
- `.env` 用 `registry.npmmirror.com`（CLAUDE.md 顶层约束）。

### 4.2 改契约 → 三前端同步（orval 链）

```
1. [shared] 改 tsp/main.tsp 或新加 sql/migrations/V00N+1__*.sql
   ↓ git commit + push

2. [shared] npm run build
   → emit:openapi 生成 generated/openapi/openapi.yaml
   ↓ git commit + push

3. [本仓] npm run gen:shared
   → orval 读 ../shared/generated/openapi/openapi.yaml
   → 生成 src/api/endpoints/endpoints.ts + endpoints.schemas.ts
   ↓ git commit + push（打 tag v<X>-<YYYYMMDD>）

4. [本仓] 业务页 import 新具名函数 + 改 function-tree.md
   ↓（同 commit 推，遵循 [ADR-0003](../../../docs/adr/0003-function-tree-requires-human-approval.md)）

5. [父仓] git update-index --add --cacheinfo 160000,<NEW_HASH>,output/<proj>
   ↓ git push

6. [suite] python scripts/gate.py -p lab-management-system-react
   ↓ exit 0 才算完成
```

**关键检查点**：

- orval 排除 `frontend-bind-meta` tag（`orval.config.ts::filters`）——这是 shared 仓的 emit-only 锚点（把 8 个契约 schema 拉进 `components.schemas`），后端不实现；不 exclude 会生成一个调用必 404 的 stub；
- 改契约时必须**先**改 shared BASE tree 的 F 级（[ADR-0003](../../../docs/adr/0003-function-tree-requires-human-approval.md)），再改本仓 I 级子项——否则 L5 红（"已上线但无 BASE 引用"）。

### 4.3 门禁链

```
python scripts/gate.py -p lab-management-system-react
  ↓
L0 结构完整性    ← suite 拥有（项目不能声明）
  ├─ 必需目录存在（src/ / tests/ / .harness/stack.json / ...）
  └─ exit 1 = 结构错
  ↓
L1 格式          ← stack.json 声明
  └─ prettier --check
  ↓
L2 静态检查      ← stack.json 声明
  └─ eslint
  ↓
L3 类型/编译     ← stack.json 声明
  └─ tsc --noEmit
  ↓
L4 测试          ← stack.json 声明 + trace_cmd
  ├─ vitest run
  └─ trace_cmd 产 .state/trace.json（fn-ID → 命中/跳过）
  ↓
L5 引用完整性    ← suite 拥有
  ├─ 测试 fn-ID 必须引用已存在的 F/I
  └─ 已上线 F 必须被至少 1 个测试引用
  ↓
exit 0 = 全绿；1 = 按 fix 提示回代码改；2 = 契约/环境问题（停下问人）
```

完整门禁说明见父仓 [§5.4](../../../docs/ARCHITECTURE.md)。

---

## 5. v0.3.0 关键基建

### 5.1 与 saas-react 同款 4 文件

本仓 v0.3.0 与 [`../saas-identity-platform-react/`](../../saas-identity-platform-react/) 落地了 **同一套** env-driven 后端配置 4 件套：

| 文件 | saas-react | lab-react |
|---|---|---|
| `src/lib/env.ts` | ✅ | ✅ |
| `src/api/backend-config.ts` | ✅ | ✅ |
| `src/api/http-client.ts` | ✅ | ✅ |
| `src/api/contracts.ts` | ✅ | ✅ |

**镜像不照搬**：saas-react 的 `identityClient` / `env.ts` 专属 SSO / authStore 落地不搬——lab 走自己的 auth FSM（`auth-context.tsx`）。

### 5.2 legacy-client — 镜像页数据获取（v0.x 入口）

`src/api/legacy-client.ts`（[`docs/adr/0001-legacy-client-data-layer.md`](adr/0001-legacy-client-data-layer.md)）：

- 镜像自 `lab-nextjs/src/api/legacy-client.ts`（Sprint 2 Batch 0）；
- `apiClient` 是独立 axios 实例（`axios.create({ baseURL: "" })`），与 `http-client.ts` 的全局拦截器**互不干扰**；
- `API_ROUTES` 把 37 条 REF 旧路由映射到 lab-msw OpenAPI v2 真实路径（带 `/api` 前缀）；
- token 注入改 callback 形式 `installLegacyClient(getToken, onUnauthorized)`，main.tsx 从 auth FSM 桥接（nextjs 版的 setToken 是给 zustand authStore 用的）；
- **新增代码**（非镜像）仍优先 orval 具名函数；确需 apiClient 的新端点必须同时登记 `API_ROUTES`。

**Sprint 3+ 若做"数据获取层归一"，本 ADR 作废重议。**

### 5.3 废止的 backend-context / backend-switcher

| 旧形态 | 废止原因 | 现行替代 |
|---|---|---|
| `BackendProvider`（Context） | runtime 切后端 + localStorage 持久化 + 模块单例 | env-driven 单 URL |
| `BackendSwitcher`（运行时 UI） | 同上 | `BackendBadge` 只读显示（`apiMode` + `baseUrl`） |
| `useBackend()` | 同上 | 删除；`getApiBaseUrl()` / `getApiMode()` 直接读 env |
| `localStorage["lab.backend"]` | 持久化 baseUrl 已废弃 | `.env.local` 部署期覆盖 |

详细理由见父仓 [§3.3](../../../docs/ARCHITECTURE.md)（ADR-0014）。

### 5.4 Service Worker bootstrap 已删除

`main.tsx` 不再调 `worker.start()`——ADR-0012 v0.3.0 删除 SW 模式。dev 路径只走 msw-http（`@lab/management-system-msw/src/server.ts` 起 :5200）；`*_ENABLE_MSW` env 与 `isMswEnabled()` 函数一并删除。

### 5.5 SSO 跳板（saas → lab）

本仓不直接实现 `/api/auth/sso/callback` 路由，但 `LoginPage` 在用户提交时**跳到 saas**（`env.saasBaseUrl` = `http://localhost:5101`），saas 完成授权码流后跳回 lab 带 `?token=...&state=...`，由 `auth-context.tsx::doSetSession` 接管（不走 `/api/auth/login`）。

`http-client.ts` 的 `config.withCredentials = true` 保证跨源（aspnetcore/springboot）的 SSO state cookie 正常写入与携带——同源模式无副作用。

---

## 6. 决策索引

本仓采纳父仓 12 份 ADR（详见父仓 [§7](../../../docs/ARCHITECTURE.md)），并增加 1 份本仓特有 ADR：

| ADR | 主题 | 一句话 | 适用范围 |
|---|---|---|---|
| [父 0001](../../../docs/adr/0001-suite-owns-l0-and-l5.md) | suite 保留 L0/L5 门 | 项目不能声明约束 | 全 suite |
| [父 0002](../../../docs/adr/0002-trace-json-as-cross-language-anchor-contract.md) | trace.json 跨语言锚点 | 测试挂 fn-ID 必须经 trace_cmd | 全 suite |
| [父 0003](../../../docs/adr/0003-function-tree-requires-human-approval.md) | 功能清单变更需人批 | 改 F/I 先提 `/tree-change` | 全 suite |
| [父 0007](../../../docs/adr/0007-shared-sql-ssot.md) | shared 仓扩到双 SSOT | 契约仓同时是 API + DB schema 真源 | 全 suite |
| [父 0012](../../../docs/adr/0012-msw-as-http-server.md) | msw 仓升级为 HTTP 服务 | Express + `@mswjs/http-middleware` | 全 suite |
| **ADR-0014**（父仓 [conventions/multi-repo-family.md](../../../docs/conventions/multi-repo-family.md) §4） | env-driven 单 URL | 废弃 runtime BackendMode 联合类型 + localStorage | 6 前端仓 |
| **[0001-legacy-client-data-layer.md](adr/0001-legacy-client-data-layer.md)** | 镜像页数据获取走 legacy-client | 豁免"组件里直接 fetch"禁令中的"orval 具名函数"限定 | 仅本仓 |

**Sprint 2+ 待决策**：

- `src/features/inspection-capability/` 多资源 1 共享组件的 fn-ID 归属策略（与 saas-react 同问题，看父仓 ADR-0011 lab-vue M98 白名单镜像是否可借鉴）；
- `src/data/templates/manifests.ts` 是生成产物（nextjs `scripts/gen-template-index.mjs` 产出，14k 行），可能含 `any`/宽松类型 — 生成产物豁免"禁 any"禁令（不改手，重新生成走 nextjs 仓脚本）。

---

## 7. 术语表

| 术语 | 含义 | 详细 |
|---|---|---|
| **SSOT** | Single Source of Truth | 单一真理源；shared 仓承担双 SSOT（API + DB） |
| **BASE tree** | 契约仓的功能清单 | 只到 F 级；消费仓在 F 镜像后加 I |
| **codegen** | orval 读 openapi.yaml 生成 TS 具名函数 | 见 `orval.config.ts` |
| **env-driven 单 URL** | ADR-0014：后端 URL 走 env，不走 runtime Context | 替代旧 BackendSwitcher |
| **msw-http** | ADR-0012：msw 仓作独立 HTTP server 起 :5200 | 替代旧 Service Worker 模式 |
| **FSM（4 态）** | `idle → anonymous → awaiting_tenant → authenticated` | `state/auth-context.tsx` |
| **fnTest** | 测试 ID 嵌入 it 名称的模式 | `fnTest(["M01.F05.I01"], "...", () => {...})` |
| **trace.json** | 测试命中 fn-ID 的清单 | `trace_cmd` 产，禁止手写 |
| **TOKEN_STORAGE_KEYS** | 持久化 key 契约常量 | `lab.accessToken` / `lab.refreshToken` / `lab.activeTenantId` / `lab.activeBackend` / `lab.permissions` |
| **legacy-client** | Sprint 2 镜像页数据获取入口 | `apiClient` + `API_ROUTES`（[ADR-0001](adr/0001-legacy-client-data-layer.md)） |
| **stack.json** | 仓自描述（栈 + 门配置） | suite 门禁读它，本仓只能声明 L1-L4 |
| **shadcn/ui** | ui 原语来源 | `src/components/ui/`（不可改结构） |
| **layout route** | react-router v6 layout route | AppShell 包 22 条业务子路由 |
| **多仓家族** | 契约仓 + mock 仓 + N 前端 + M 后端 + 父仓 | 见父仓 [§2.1](../../../docs/ARCHITECTURE.md) |

---

## 附录 A：与父仓 ARCHITECTURE.md 的关系

| 父仓文档 | 本仓覆盖 |
|---|---|
| [父仓 §1 套件全景](../../../docs/ARCHITECTURE.md) | §1 仓在 lab 家族的位置（react-ts 前端 1/3） |
| [父仓 §2.3 14 仓 5 段结构](../../../docs/ARCHITECTURE.md) | §2 目录骨架（react-ts 变体） |
| [父仓 §3.3 后端模式 env-driven](../../../docs/ARCHITECTURE.md) | §5.1 v0.3.0 关键基建 + §5.3 废止清单 |
| [父仓 §3.5 端口 / CORS 对称](../../../docs/ARCHITECTURE.md) | §4.1 dev 模式（msw-http :5200） |
| [父仓 §3.6 Mock 仓 B 强度](../../../docs/ARCHITECTURE.md) | §4.1 dev 模式（lab-msw :5200） |
| [父仓 §4.3 前端仓 react-ts 形态](../../../docs/ARCHITECTURE.md) | §2 + §3 全章（react 专属命名） |
| [父仓 §5.2 前端开发流程](../../../docs/ARCHITECTURE.md) | §4.1 dev 模式（lab-react 专属） |
| [父仓 §5.4 门禁链](../../../docs/ARCHITECTURE.md) | §4.3 门禁链（lab-react 配置） |
| [父仓 §7 决策索引](../../../docs/ARCHITECTURE.md) | §6 决策索引（仅本仓相关 ADR） |
| [父仓 §8 术语表](../../../docs/ARCHITECTURE.md) | §7 术语表（本仓专属术语） |

---

## 附录 B：与 saas-identity-platform-react 同构对照

| 维度 | saas-react | lab-react |
|---|---|---|
| 家族 | saas-identity-platform | lab-management-system |
| 后端仓（同源） | saas-msw :5100 | lab-msw :5200 |
| 后端仓（跨源真后端） | saas-springboot :5105 / saas-aspnetcore :5104 | lab-springboot :5205 / lab-aspnetcore :5204 |
| 契约源 | `saas-shared/generated/openapi/openapi.yaml` | `lab-shared/generated/openapi/openapi.yaml` |
| env 4 件套 | `lib/env.ts` / `api/backend-config.ts` / `api/http-client.ts` / `api/contracts.ts` | 同款 4 件套 ✅ |
| 业务页 | M00-M03（M00 租户 / M01 RBAC / M02 OAuth / M03 资源） | M00-M06（M00 租户 / M01 认证 / M02 合同 / M03 试验过程 / M04 基础数据 / M05 数据统计 / M06 检测能力） |
| legacy-client | 无（saas-nextjs 兼全栈后端，无需 1:1 镜像） | 有（[ADR-0001](adr/0001-legacy-client-data-layer.md)，镜像自 lab-nextjs features 层） |
| SSO 跳板 | lab 跳 saas | saas 跳 lab |
| 跨仓组件复用 | — | 禁复制 saas-react 组件源码（lab 自己写） |

**SSOT 原则**：两端同名 4 件套是同构落地的结果，**不是**同仓依赖——共享的是 *模式*（env-driven + axios interceptor + FSM），不是 *代码*。仓间只走 `../lab-shared/generated/openapi/openapi.yaml` 这一条契约链。

---

## 附录 C：典型陷阱（详见 `../../../memory/`）

| 陷阱 | 后果 | 解法 |
|---|---|---|
| orval + axios 没 installHttpClient 拦截器 | prod 永远走同 origin 被 nginx 405 | main.tsx bootstrap 调 installHttpClient |
| axios baseURL 含 `/api/v1` 前缀 | path 前缀重复 | baseURL 是 root URL；path 自带 prefix |
| 改 `.env` 后没重启 vite | env 不生效（Vite 启动期注入） | 修改后必须重启 vite |
| 组件里直接 `fetch()` 业务路径 | 违反 CLAUDE.md 禁令；fnTest 不可达 | 走 src/api/ 层（orval 具名函数或 legacy-client） |
| 用 `window.confirm` / `window.alert` | 违反禁令；不可测试 | 走 ConfirmDialog + sonner |
| 用 `bg-[#..]` / 裸 hex | 违反禁令 | 只用 index.css 语义 token |
| 复制 saas-react 组件源码 | 跨仓耦合 | lab 自己写；只参考模式 |
| localStorage 散落 `lab.xxx` | 违反禁令；契约 key 漂移 | 统一走 `TOKEN_STORAGE_KEYS` 契约常量 |
| 手写 backend 路由（`src/app/api/*/route.ts`） | 违反禁令（lab 仓不兼全栈） | 数据走 lab-msw 或 lab-nextjs |

---

## 附录 D：相关约定 / 决策 / 文档

- 仓入口：[`../CLAUDE.md`](../CLAUDE.md)
- 功能清单（唯一锚点）：[docs/functions/function-tree.md](functions/function-tree.md)
- 需求 → 任务 → 功能影响：[docs/requirements/](requirements/)
- 流程/设计：[docs/design/](design/)
- 本仓 ADR：[docs/adr/](adr/)
- 编码细则（不入主上下文）：[docs/conventions/](conventions/)
- sprint 路线：[docs/conventions/sprint-roadmap.md](conventions/sprint-roadmap.md)
- env 配置细则：[docs/conventions/env-config.md](conventions/env-config.md)
- UI 底座：[docs/conventions/app-ui.md](conventions/app-ui.md)
- 性能细则：[docs/conventions/react-perf.md](conventions/react-perf.md)
- 镜像来源：[`../lab-management-system-nextjs/src/`](../../lab-management-system-nextjs/src/)（仅参考）
- SSOT（OpenAPI.yaml）：[`../lab-management-system-shared/generated/openapi/openapi.yaml`](../../lab-management-system-shared/generated/openapi/openapi.yaml)
- 共享 mock 后端：[`../lab-management-system-msw`](../../lab-management-system-msw/)（`@lab/management-system-msw`）
- 父仓 ARCHITECTURE.md：[`../../../docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md)
- 跨仓经验教训：`../../../memory/`（非入仓，~/.claude/...）