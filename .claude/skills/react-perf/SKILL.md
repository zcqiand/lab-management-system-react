---
name: react-perf
description: 编写、审查、重构 React 或 Next.js 代码时使用。涉及组件、数据获取、bundle 体积、渲染性能、重渲染优化时触发。基于 Vercel Engineering 的性能规则集。
---

# React Performance

## 先看这条：规则分三类，落点不同

| 类别 | 谁强制 | 你该做什么 |
|---|---|---|
| 已进 eslint | `L2 静态检查`，exit 1 | 什么都不用做，门会拦你 |
| 需上下文判断 | 无人强制 | 写之前读 `docs/conventions/react-perf.md` |
| 需人评审 | code-reviewer agent | 列出选项，交给人 |

**不要在 markdown 里重复 eslint 已经强制的规则。** 那是噪音，且会让人以为其余规则也有强制力。

## 已被 eslint 强制的（见 eslint.config.js）

- 组件内定义组件 → `react/no-unstable-nested-components`
- barrel 文件导入 → `no-restricted-imports`
- effect 依赖不全 → `react-hooks/exhaustive-deps`
- `any` / `@ts-ignore` → `@typescript-eslint/*`

这些不需要你判断。写错了 L2 门直接红。

## 需要你判断的（按影响排序）

### 1. 瀑布流（CRITICAL）
最贵的性能问题，且 eslint 看不见。

- 独立的异步操作用 `Promise.all()`，不要串行 await
- 便宜的同步条件先判断，再 await 远程值
- await 尽量下沉到真正用到它的分支里
- API route 里：早启动 promise，晚 await

### 2. Bundle 体积（CRITICAL）
- 直接导入，不走 barrel 文件
- 重组件用 `next/dynamic`
- 分析/日志类脚本在 hydration 之后加载
- import 路径保持静态可分析

### 3. 服务端（HIGH）
- `React.cache()` 做单请求内去重
- 传给客户端组件的数据要最小化
- 别在 RSC/SSR 的模块级放可变的请求态

### 4. 重渲染（MEDIUM）
- 只在回调里用到的 state，不要订阅
- 派生状态在 render 期间算，不要用 effect
- 订阅派生出的布尔值，不要订阅原始值

## 细则

完整的 70 条规则、每条的正误代码示例，见 `references/`（渐进披露，不要预加载）。
判断口径与本项目的取舍见 `docs/conventions/react-perf.md`。

## 边界

性能规则是**判断**，不是事实。同一条规则在不同场景下的收益可能相反
（`useMemo` 在简单表达式上是净亏损）。所以：

- 不要因为规则存在就套用它。先说明这段代码为什么慢
- 不要在没有 profile 数据的情况下做"性能重构"
- 遇到规则之间冲突，列出取舍，交给人

## 引入 Vercel 官方规则集

把 vercel 的 `rules/` 与 `AGENTS.md` 放进本目录的 `references/`。
它们是 MIT 许可的。放进去之后，本 SKILL.md 仍然是索引 —— 不要把 70 条正文搬上来。
