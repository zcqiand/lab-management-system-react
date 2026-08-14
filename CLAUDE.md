# CLAUDE.md — 实验室管理系统React前端

> 入口，不是手册。只做三件事：声明技术栈 / 声明禁止事项 / 指向别处。
> 超过 5 行的细则写进 `docs/conventions/`，由 skill 按需引用。L0 门强制上限 60 行。

## 1. 技术栈

`react-ts` — React 19 + TypeScript + Vite + Vitest + ESLint + Prettier + Tailwind v4 + shadcn/ui

门禁命令见 `.harness/stack.json`。**不要改它来让门变松。**

## 2. 禁止事项（硬约束）

- 禁止使用 any 与 @ts-ignore（除非附 ADR 说明）
- 禁止在组件里直接 fetch；数据获取走 src/api/ 层
- 禁止 class 组件；一律函数组件 + Hooks
- 禁止内联样式对象承载布局；布局用 Tailwind 类
- 禁止手写按钮/输入/表格/弹窗的样式类；一律用 src/components/ui/ 原语
- 禁止各功能页各写标题栏/分页/空态；用 src/components/app/ 复合原语
- 禁止裸颜色（bg-[#..] / 原始 hex）；只用 index.css 里的语义 token（bg-primary / text-muted-foreground 等）
- 禁止用 window.confirm / window.alert；危险操作走 ConfirmDialog，反馈走 sonner
- npm 依赖一律走 registry.npmmirror.com
- 禁止 localStorage 直接散落在组件中；统一走 src/store/
- 禁止直接修改 `docs/functions/function-tree.md`；走 `/tree-change` 提案，由人批准
- 禁止先改代码后补功能清单；改功能与改功能清单必须同一个 commit
- 禁止删除功能清单里的行来消除告警；废弃只改状态，编号永不复用
- 禁止给 skip 的测试挂功能 ID
- 禁止在本文件里堆积细则

## 3. 指向别处

- 功能清单（唯一锚点） → `docs/functions/function-tree.md`
- 需求 → 任务 → 功能影响 → `docs/requirements/`
- 流程/设计 与功能对齐 → `docs/design/`（人评审，机器只查引用）
- 决策背景 → `docs/adr/`
- 编码细则 → `docs/conventions/`

## 4. 工作循环

0. **开工前分诊**：动手前先过 `using-skills`，判断该激活哪些 skill、把它们的清单落成 todo。
   顺序不可倒：规格(brainstorming)→计划(writing-plans)→测试先红(red-first)→实现(executing-plans)。
1. 读 `.state/session.json` 恢复上下文
2. 最小改动
3. 在 **suite 根目录** 跑 `python scripts/gate.py -p lab-management-system-react`
4. exit 0 才算完成；非 0 回到第 2 步；exit 2 停下问人
5. `/handoff` 更新 `.state/session.json`
