---
name: app-ui
description: 搭建或修改 React 前端界面时使用。涉及页面布局、列表/表格、表单、弹窗、按钮、颜色、加载/空/错三态、后台管理界面一致性时触发。基于本项目的 shadcn/ui 设计系统底座。
---

# App UI（设计系统底座）

这个 suite 给每个 react-ts 项目预装了一套 shadcn/ui 设计系统底座。
你的工作不是「设计」界面，是**从底座里取原语拼装**。糙界面几乎都来自
「不知道有底座、于是手搓」。所以先认底座，再动手。

## 先看这条：规则分三类，落点不同

| 类别 | 谁强制 | 你该做什么 |
|---|---|---|
| 已进 eslint | `L2 静态检查`，exit 1 | 什么都不用做，门会拦你 |
| 需上下文判断 | 无人强制 | 写之前读 `docs/conventions/app-ui.md` |
| 需人评审 | code-reviewer agent | 列出选项，交给人 |

**不要在 markdown 里重复 eslint 已经强制的规则。**

## 已被 eslint 强制的（见 eslint.config.js）

- 裸 hex 颜色 `bg-[#3b82f6]` → `no-restricted-syntax`（design-tokens-only）
- 行内 `rgb()/hsl()` 颜色 → `no-restricted-syntax`
- 组件内定义组件（含列表 cell 渲染函数）→ `react/no-unstable-nested-components`

写错了 L2 门直接红，不需要你判断。

## 底座清单：动手前先认这些

**shadcn 原语** `src/components/ui/`：button、input、textarea、label、badge、
card、table、select、checkbox、separator、skeleton、dialog、alert-dialog、
dropdown-menu、sonner。缺的用 `npx shadcn@latest add <name>` 补，别手搓。

**app 复合原语** `src/components/app/`（本 suite 的一致性层）：

| 原语 | 用途 | 替代掉的坏习惯 |
|---|---|---|
| `PageHeader` | 页面标题栏 + 主操作 | 各页各写 h2 + 按钮 |
| `DataTable` | 列表，内建 loading/empty/data 三态 | 手写 `<table>` + 「加载中…」 |
| `PaginationBar` | 分页条 | 各写各的翻页 |
| `EmptyState` | 空态 | 甩一句「暂无数据」 |
| `ConfirmDialog` | 危险操作二次确认 | `window.confirm` |
| `Field` | 表单行：label+控件+错误 | label 间距/错误色各页不一 |

## 需要你判断的（细则见 docs/conventions/app-ui.md）

1. **三态**：列表/异步区域必须处理 loading（骨架屏）、empty（EmptyState）、
   error（可重试 + sonner）。缺一种就是 bug。
2. **颜色**：只用 `index.css` 的语义 token（`bg-primary` / `text-muted-foreground`），
   深色模式因此免费。需要新色去 index.css 加 token。
3. **层级**：一屏只有一个 `variant="default"` 主操作，其余用 outline/ghost。
4. **密度**：间距走 4px 栅格（`gap-2`/`gap-4`/`space-y-4`），不用魔法数。

## 建一个 CRUD 页的配方

1. `PageHeader`（标题 + 「新增」按钮）
2. 筛选区：`Input`（搜索）+ `Select`（状态）
3. `DataTable`：列定义用**模块作用域**的 `createColumns(handlers)` 工厂
4. `PaginationBar`
5. 新增/编辑放 `Dialog`，字段用 `Field`
6. 删除走 `ConfirmDialog`，反馈走 `sonner`

完整可跑、且已过 L1/L2/L3 三门的示例：
`references/crud-page-example.tsx`（渐进披露，需要时再读，可整段复制改造）。

## 边界

- 设计取舍（信息架构、复杂交互、品牌视觉）是**判断**，不是套模板。
  遇到底座覆盖不了的复杂界面，列出方案交给人，不要硬凑。
- 不要因为要「精致」就引入一堆动画/渐变。精致来自一致的间距、
  正确的三态、克制的层级 —— 底座已经把这些给你了。
