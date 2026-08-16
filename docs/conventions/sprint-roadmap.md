# Sprint 路线图 — lab-react / lab-vue

> 2026-08-17 sprint 0 启动。两个仓共用的 5 周路线，写一次双仓引用。

## 范围

| 模块 | 页面数 | 仓 |
|---|---|---|
| M01 认证管理 | 0（守卫/inline 复用） | 1 login + 1 sidebar |
| M02 合同管理 | 1 | contracts |
| M03 试验过程 | 8 | data-entry / task-assignment / receipts(列表+详情) / report-review / report-approve / report-issue / report-archive |
| M04 基础数据 | 4 | brands / grades / models / specifications（共用 CategoryDictList） |
| M05 数据统计 | 1 | summary |
| M06 检测能力 | 11 | inspection-{calculation-rules, objects, parameters, specialties, standards, technical-requirements, param-interfaces, report-names} + page.tsx |
| **合计** | **26 页 + 1 login + 1 sidebar + 4 基建** | |

## Sprint 拆分

### Sprint 0（已完成）

- lab-react + lab-vue 双仓 CLAUDE.md 加 §0 当前定位
- function-tree.md 顶部加"前端 only 镜像仓"标注
- baseline gate 验证
- 本约定文件双仓各一份

### Sprint 1（week 1-2）

**目标**：双仓都能跑 dev，能进 `/login`，能进受守卫保护的业务页（即便大部分是空壳）

**4 基建**（react + vue 各一份）：

| 文件 | react | vue |
|---|---|---|
| 路由配置 | `src/App.tsx` + `react-router-dom` | `src/router.ts` + `vue-router` |
| 守卫 + Layout | `src/components/app/app-shell.tsx` | `src/components/app/app-shell.vue` |
| 侧边栏 | `src/components/app/sidebar-nav.tsx` | `src/components/app/sidebar-nav.vue` |
| 后端切换器 | `src/components/app/backend-switcher.tsx` | `src/components/app/backend-switcher.vue` |
| CRUD 弹窗 | `src/components/app/crud-dialog.tsx` | `src/components/app/crud-dialog.vue` |
| 登录页 | `src/pages/LoginPage.tsx` | `src/pages/LoginPage.vue` |

**配套**：

- `src/api/backend-config.ts`（react + vue 各一份）
- `src/state/backend-context.tsx`（react：Context；vue：Pinia store）
- `src/state/auth-context.tsx`（react）/ `src/state/auth.ts`（vue Pinia）
- 路由守卫 hook（`useRequireAuth()` react / `useRequireAuth()` vue composition）
- M01.F04.I02/I04 + M01.F05.I01-I05 7 子项（与 nextjs 同套）

**lab-react 验证**：用 react-router-dom 渲染 `(console)/*` 路径，token 不存在 → /login

**lab-vue 验证**：用 vue-router 渲染 `(console)/*` 路径，token 不存在 → /login

### Sprint 2（week 3-4.5）

**react 大跃进**：
- 一次性镜像 nextjs 25 个剩余页面（机械搬运）
- 替换 `next/navigation` → `react-router-dom`（useRouter → useNavigate 等）
- 替换 `<Link href>` → `<Link to>`
- 删除 8 个 `src/app/api/*/route.ts`（不实现后端 route）
- orval client 跑 `npm run gen:shared` 出具名函数

**vue 启动**：
- 在 react 已交付页面基础上，Vue 3 + shadcn-vue 重写
- 复用 react 仓的"字段 schema"（ConfirmDialog 的 fields / DataTable 的 columns / CRUD Dialog 的 form schema），仅翻译 template 写法

### Sprint 3（week 4.5-5）

**end-to-end 验证**：
- 双仓 dev 启动 → 浏览器走查 26 页
- tree-change 提案批 已上线（按 fnTest 通过 + data-fn 挂好）
- gate L0-L5 全绿 + 0 软告警
- 双仓 function-tree 状态推进：99 规划 → 大部分 已上线
- 双仓 docs/conventions/ 补 1 份"前端镜像规则"总结

## 镜像规则（react 仓专）

nextjs → react 的镜像模式：

1. **page.tsx 内容直接搬**，改：
   - `next/navigation` 的 `useRouter`/`useSearchParams` → `react-router-dom` 的 `useNavigate`/`useSearchParams`
   - `<Link href="/foo">` → `<Link to="/foo">`
   - `import { Metadata }` → 删（Vite 不需要）
2. **features/xxx/ 不动**，直接搬
3. **components/app/* 直接搬**，改 `useRouter` import
4. **删 src/app/api/*/route.ts**（8 个文件直接 rm）
5. **删 src/app/api/contracts/[id] 动态路由**（用 react-router 配置代替）
6. **data-fn / @entry / fnTest 完全不动**

## 翻译规则（vue 仓专）

react → vue 的翻译模式（仅 Sprint 2+）：

1. **JSX → template 语法**：`<div className="x">` → `<div class="x">`
2. **hook → composition**：`useState` → `ref`，`useEffect` → `watch`/`onMounted`
3. **Context → Pinia store**：`useAuth()` → `useAuthStore()`
4. **react-query → vue-query**：`useQuery({queryKey, queryFn})` → `useQuery({queryKey, queryFn})`（API 几乎同款）
5. **data-fn / @entry / fnTest 完全不动**