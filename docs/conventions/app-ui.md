# app-ui：设计系统使用约定

这份约定管的是「界面怎么搭才一致、才不糙」。它不讲某个组件的 props，
讲的是**判断**：什么时候用哪个原语、三态怎么处理、密度和层级怎么定。
能被机器判定的（裸颜色、手写按钮样式）已经进了 eslint，这里不重复。

## 底座：两层原语

```
src/components/ui/     shadcn 原语，等同 `npx shadcn add` 产出。可自由编辑，归项目所有。
src/components/app/    复合原语，本 suite 的一致性层。列表页/表单/危险操作统一走这里。
```

**铁律：不要重造原语。** 需要按钮就 `import { Button }`，需要列表就 `DataTable`。
手写 `<button className="bg-blue-600 ...">` 会被 L2 拦截（design-tokens-only），
但即使没被拦，也是错的 —— 它让每个页面的按钮长得不一样。

## 颜色：只用语义 token，不用裸色

`src/index.css` 定义了一套语义 token（light + dark 双主题，oklch）。
你只跟语义打交道，不跟具体色值打交道：

| 要什么 | 用什么 | 不要写 |
|---|---|---|
| 主操作底色 | `bg-primary text-primary-foreground` | `bg-blue-600` |
| 次要文字 | `text-muted-foreground` | `text-gray-500` |
| 卡片/面板 | `bg-card` / `bg-background` | `bg-white` / `bg-gray-800` |
| 边框 | `border` / `border-input` | `border-gray-200` |
| 危险 | `bg-destructive` / `text-destructive` | `bg-red-600` |

裸 hex（`bg-[#3b82f6]`）与行内 `rgb()/hsl()` 已被 eslint 禁掉。
需要新色时，去 `index.css` 加一个 token，不要在 className 里硬编码。
深色模式因此是免费的 —— token 在 `.dark` 下自动切换，你不写任何深色分支。

## 三态：列表和异步区域必须处理三种状态

任何「要从后端拿数据再展示」的区域，都有三种状态。缺一种就是 bug：

1. **loading** —— 出骨架屏（`Skeleton`），不要出「加载中…」纯文本，更不要白屏。
   `DataTable` 已内建：传 `loading` 即出骨架行。
2. **empty** —— 出 `EmptyState`（图标 + 一句话 + 引导操作），不要甩「暂无数据」。
   区分「本来就没有」和「搜索/筛选后没有」，文案不同。
3. **error** —— 出可重试的提示，不要把整页白掉。错误反馈用 `sonner`。

`DataTable` 把 loading / empty / data 三态收敛在一个组件里，
这就是为什么列表不要自己写 `<table>`。

## 密度与间距：跟着 token 走

- 页面外层容器：`space-y-4`（区块之间）与 `p-6`（页面留白）。
- 表单字段之间：`space-y-4`；一个字段内 label 与控件：`space-y-2`（`Field` 已封）。
- 不要用魔法数 `mt-[13px]`。间距走 Tailwind 的 4px 栅格（`gap-2` / `gap-4`）。
- 表格是信息密集区，行高保持紧凑（`DataTable` 已定），不要给单元格塞大 padding。

## 层级：一个页面只有一个主操作

- 页面顶部用 `PageHeader`，主操作（新增/保存）放在 `actions`，用 `variant="default"`。
- 一屏之内 `variant="default"` 的按钮只应有一个。其余用 `outline` / `ghost` / `secondary`。
- 危险操作（删除）用 `variant="destructive"`，且必须走 `ConfirmDialog` 二次确认。
- 行内操作（每行的编辑/删除）收进 `DropdownMenu`，不要在每行平铺一排按钮。

## 表单：字段走 Field，校验就地显示

- 每个字段用 `Field`（label + 控件 + 错误/提示），必填项 label 带红星。
- 校验错误显示在字段下方（`Field` 的 `error`），不要只弹一个全局 toast。
- 提交中禁用提交按钮并显示 loading，避免重复提交。
- 表单放 `Dialog`（轻量新增/编辑）或独立页（复杂表单）。不要用 `window.prompt`。

## DataTable 的列定义放模块作用域

列定义（`Column<T>[]`）要放在组件外的工厂函数里，行内操作通过参数注入：

```tsx
function createColumns(h: { onEdit: (r: T) => void }): Column<T>[] { ... }
// 组件内：const columns = createColumns({ onEdit: ... })
```

这既满足 L2 的 `react/no-unstable-nested-components`，
又让列引用稳定、不随每次渲染重建。完整可跑示例见
`.claude/skills/app-ui/references/crud-page-example.tsx`。

## 加组件：优先 shadcn 官方，不要手搓

底座只装了常用的一组原语。需要 `tabs` / `tooltip` / `popover` / `command` 等时：

```bash
npx shadcn@latest add tabs
```

它会把组件写进 `src/components/ui/`，风格与现有原语一致。
不要手搓一个半成品 Tabs —— 那正是「不够精致」的来源。

## 入口锚点：面向用户的功能挂 data-fn

按钮、菜单项、路由等**触发用户功能**的元素，挂 `data-fn="<子项ID>"`，
让 L5 能验证「用户点得到这个功能」（见 reachability skill）。逻辑写好、测试变绿，
但界面没入口，用户照样用不了——data-fn 就是把这条做成机器可查的。

```tsx
<Button data-fn="M01.F01.I01" onClick={openCreate}>新增项目</Button>
// 行内操作、路由等同理；接口类子项不用挂（后端，间接可达）
```

已上线的面向用户子项没挂 data-fn → L5 硬失败。别乱挂到不相干元素消警告，那是伪造可达性。

## 实现锚点 @impl（可选，给写书用）

`data-fn` 管「用户点得到」（L5 硬门）。若某个 `接口`/纯逻辑子项没有 UI 入口，
但你希望配套书能引用它的实现文件，在该文件挂一行 `// @impl <子项ID>`。
它不影响 L5（不挂不会红），只被 `export_handoff.py` 扫进 handoff 的 source_index。
