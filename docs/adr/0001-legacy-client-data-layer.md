# 0001. Sprint 2 镜像页数据获取走 legacy-client（apiClient + API_ROUTES）

- 状态: Accepted
- 日期: 2026-08-17
- 决策者: 项目所有者（Sprint 2 Batch 0 计划批准）

## Context

CLAUDE.md 禁令原文：「禁止在组件里直接 fetch；数据获取走 src/api/ 层（orval 具名函数）」。

Sprint 2 要把 lab-nextjs 的 22 条业务路由 / 41 个 features 文件（~11.5k 行）镜像到本仓。调研确认 nextjs features 层的数据获取 100% 走 `apiClient + API_ROUTES`（`src/api/legacy-client.ts`，37 条路由映射），零 orval 函数、零 react-query。`API_ROUTES` 的存在本身就是因为 orval 生成形态与 msw handler 有 drift（如 dictCrud 裸数组 → `{items}` 需要 shape adapter 兜底）。

两个选项：

1. **搬 legacy-client**：features 组件调用点零改动，与 nextjs 行为 1:1
2. **改造成 orval 具名函数**：每个 features 文件 3-10 处调用重写（11.5k 行全动），且要重新解决 shape drift

## Decision

选 1。禁令解读：

- 禁令的主句是「禁止**在组件里**直接 fetch」+「走 **src/api/ 层**」——legacy-client 就是 `src/api/` 层的一个文件，features 组件调 `apiClient.get(API_ROUTES['/xxx'])` 不构成「组件里 fetch」，字面合规
- 括号里的「orval 具名函数」是 Sprint 0 骨架期的表述，Sprint 2 镜像任务经本 ADR 正式豁免：**镜像页（src/features/）数据获取走 legacy-client**

约束：

- `src/api/legacy-client.ts` 与 nextjs 版差异仅两处（token 注入改 `installLegacyClient(getToken, onUnauthorized)` callback 桥接 auth FSM；identityClient/env.ts 不搬——SSO/authStore 专属）
- **新增代码**（非镜像）仍优先 orval 具名函数；确需 apiClient 的新端点必须同时登记 `API_ROUTES`
- 与 orval endpoints（`src/api/http-client.ts` 拦截器装全局 axios）并存：legacy-client 用独立 axios 实例（`axios.create({baseURL: ""})`），两套拦截器互不干扰

## Consequences

- Sprint 3+ 若做「数据获取层归一」，本 ADR 作废重议
- vue 仓镜像时同样模式（legacy-client + API_ROUTES 翻译）

## 附带挂账

- `src/data/templates/manifests.ts` 是生成产物（nextjs `scripts/gen-template-index.mjs` 产出，14k 行），可能含 `any`/宽松类型 — 生成产物豁免「禁 any」禁令（不改手，重新生成走 nextjs 仓脚本）
