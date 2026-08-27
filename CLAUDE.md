# CLAUDE.md — 实验室管理系统React前端

> 书稿配套仓 + harness 门禁仓双身份。入口，不是手册。L0 门强制上限 60 行。
> 本仓为《（书稿信息待补）》案例（待补）的可运行配套工程，是书稿代码块的 **source of truth**。

## 1. 项目定位

实验室管理系统的 React 前端（前端 only 镜像仓）：镜像 nextjs 仓 26 页 UI，**不实现 `/api` route**。
后端由 msw / nextjs / springboot / aspnetcore 提供。lab 自己写组件，不复用 saas 仓组件。

## 2. 铁律

- **TDD**：先写失败测试 → 确认红 → 实现 → 确认绿 → commit
- **版本钉死**：依赖与 `version-lock.json` 的 `version_lock` 一致；不引入 lock 外的库
- **tag 即放行**：全量回归绿后打 `v<MAJOR>.<MINOR>.<PATCH>-<YYYYMMDD>`（如 `v0.3.11-20260826`）
- **mock-friendly**：`npm install && npm test` 无 Key、无 Docker、无网全绿
- **功能清单是锚点**：改 function-tree 走 `/tree-change`；同 commit；废弃只改状态，编号不复用
- 禁止 any / @ts-ignore（除非附 ADR）；禁止 class 组件；禁止组件内直接 fetch（走 src/api/ orval 具名函数）
- 禁止手写 UI 原语样式类（用 `src/components/ui/`）；布局用 Tailwind，禁裸颜色（只用语义 token）
- 禁止 `window.confirm/alert`（走 ConfirmDialog / sonner）；localStorage 统一走 `src/store/`
- 禁止加 `src/app/api/*/route.ts` 后端 route；禁止 import shared TS 客户端；禁止复制 saas 仓组件源码
- 禁止运行时切后端（ADR-0014 已废弃）；`VITE_API_BASE_URL` 等写到 `.env.example`
- npm 依赖一律走 registry.npmmirror.com

## 3. 技术栈与版本（钉死于 version-lock.json）

React 19 + TypeScript 5.7 + Vite + Vitest + Tailwind v4 + shadcn/ui + orval(axios)。明细见 `version-lock.json`。

门禁命令见 `.harness/stack.json`。**不要改它来让门变松。**

## 4. 验收

- suite 根目录跑 `python scripts/gate.py -p lab-management-system-react`
- 改了 shared → `npm run gen:shared`

## 5. 指向别处

- SSOT（OpenAPI） → `../lab-management-system-shared/generated/openapi/openapi.yaml`
- mock 后端 → `../lab-management-system-msw`；镜像来源（UI 设计） → `../lab-management-system-nextjs/src/`
- sprint 路线 → `docs/conventions/sprint-roadmap.md`
- 决策 → `docs/adr/`；细则 → `docs/conventions/`；待办 → `PLAN.md`；版本 → `CHANGELOG.md`

## 6. 工作循环

1. 读 `.state/session.json` 恢复上下文；最小改动
2. gate exit 1 修；exit 2 停下问人
3. `/handoff` 更新 `.state/session.json`
