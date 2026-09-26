# 实验室管理系统 · React 前端

建筑工程实验室管理系统的 React 前端 —— 镜像 nextjs 仓 26 页 UI（Vite + shadcn/ui），前端 only。

本仓为《React从入门到项目实践》（亚马逊电子书）案例一「实验室管理系统」（第 34-38 章）的可运行配套工程，是书稿代码块的 **source of truth**。

## 快速开始

```bash
npm install        # 安装依赖
npm test           # 全量测试（无 Key / 无 Docker / 无网可跑）
npm run dev        # 本地开发（Vite）
npm run build      # 生产构建
```

以上为前端本仓；完整跑通业务链路还需按各章说明启动配套后端与数据库（见第 34 章）。

## 功能特性

- 镜像 lab-nextjs 26 页 UI；不实现 `/api` route（后端走 nextjs / springboot / aspnetcore）
- orval 读 shared 仓 OpenAPI 生成 `src/api/endpoints/`（axios 具名函数）
- shadcn/ui + Tailwind v4 语义 token；env 驱动单 URL（ADR-0014）

## 技术栈

| 技术 | 版本 |
| :--- | :--- |
| React | ^19.2.0 |
| React Router DOM | ^7.9.0 |
| @tanstack/react-query | ^5.62.0 |
| orval（axios client） | ^7.21.0 |
| TypeScript | ^5.7.0 |
| Vite | ^8.2.1 |
| Vitest | ^4.0.0 |
| Tailwind CSS | ^4.3.0 |

> 依赖版本与 `version-lock.json` 的 `version_lock` 一致，不引入 lock 外的库。

## 配套书籍及章节映射

> 同一案例仓后续接入其他书籍时，在此节下新增书籍小节。

### 《React从入门到项目实践》（亚马逊电子书）

- 书稿基线：tag `v0.3.29-20260924`（冻结，正文代码清单以此为准）
- 书稿定位：案例一「实验室管理系统」，覆盖第 34-38 章

| 章 | 主题 | 对应源文件 |
| :--- | :--- | :--- |
| 34 | 案例一：项目立项与架构设计 | `src/lib/env.ts`、`src/state/auth-context.tsx` |
| 35 | 案例一：业务模块 CRUD——合同、接样单与码表字典 | `src/features/contracts/ContractsList.tsx`、`src/features/receipts/ReceiptsList.tsx` |
| 36 | 案例一：检测能力配置——专项、参数、标准与报告名称 | `src/features/inspection-capability/InspectionCapabilityList.tsx`、`src/features/inspection-capability/ParameterStandardLinkDialog.tsx` |
| 37 | 案例一：流程引擎——从任务分配到归档的七阶段流水线 | `src/features/task-assignment/TaskAssignmentList.tsx`、`src/features/reports/ReportPhasePage.tsx` |
| 38 | 案例一：测试与交付 | — |

## 快速链接

- [CLAUDE.md](CLAUDE.md) — 开发约定与编码规范
- [系统架构.md](docs/ARCHITECTURE.md) — 结构 / 边界 / 数据流 / 决策
- [功能规格.md](docs/functions/function-tree.md) — 功能名称、描述与验收标准
- [未来开发计划](PLAN.md) — 待办与迭代方向
- [更新日志](CHANGELOG.md) — 版本变更记录
