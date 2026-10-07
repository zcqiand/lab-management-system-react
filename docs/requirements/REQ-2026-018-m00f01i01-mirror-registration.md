# REQ-2026-018 M00.F01.I01 顶栏登录用户显示名——镜像登记补漏（L5 悬空修复）

| 项 | 值 |
|---|---|
| 提出人 | Claude 机器侧规划推进 |
| 提出日期 | 2026-10-07 |
| 优先级 | P2 |
| 状态 | 已评审 |
| 关联 ADR | ADR-0042（mirror 免批三类） |

## 1. 需求描述

gate L5 悬空引用：`tests/app-shell-display-name.dom.test.tsx`（d7fadb3）挂
`M00.F01.I01`，但 react 树只有 M00.F01 模块行、无叶子行——测试先于镜像登记
入库，gate L5 因此红。

shared SSOT（lab-management-system-shared `docs/functions/function-tree.md`
M00.F01.I01「当前会话」）状态**已上线**；nextjs 镜像行同名已上线
（顶栏 displayName，data-testid=user-display-name）。react 侧实现早已在库：
`src/components/app/app-shell.tsx` 顶栏 displayName（2026-09-23 用户裁定：
displayName 空串回退 username，`||` 而非 `??`，data-testid=appshell-user-name），
回归锁 `tests/app-shell-display-name.dom.test.tsx` 同批入库。

**本需求只做镜像登记**（ADR-0042 免批类）：补 react 树 M00.F01.I01 叶子行 +
设计映射 1 行，使测试引用落地。不改任何实现。

### 澄清记录

| 疑问 | 澄清结论 | 澄清人 | 日期 |
|---|---|---|---|
| 是否需要新实现？ | 否——实现与测试已在库（d7fadb3），只补镜像行 | Claude | 2026-10-07 |
| 状态登记为何值？ | 已上线——shared/nextjs 同名行均已上线，react 实现已 gated 入库 | Claude | 2026-10-07 |

## 2. 验收标准

| 编号 | 场景（给定） | 操作（当） | 预期（则） |
|---|---|---|---|
| AC-1 | react 树缺 M00.F01.I01 叶子行 | 走 tree_change.py 正门镜像登记 | 树行存在且状态=已上线；L5 悬空引用消除 |
| AC-2 | 镜像行登记后 | 跑 `python scripts/gate.py -p lab-management-system-react` | L5 引用完整性绿（EXIT=0） |
| AC-3 | 显示名实现 | 跑 tests/app-shell-display-name.dom.test.tsx | 回归锁绿（空串回退 username，不兜空串） |

## 3. 任务拆解

| 任务 ID | 任务描述 | 类型 | 负责人 | 预估 | 状态 |
|---|---|---|---|---|---|
| T-1 | tree_change.py 正门镜像登记 M00.F01.I01（--report → --apply）+ 树行 + 设计映射 + 本 REQ + 台账 | 文档对齐 | Claude | 0.5h | 完成 |
| T-2 | 全门复跑（L1-L4 + trace + gate EXIT=0） | 门禁 | Claude | 0.5h | 完成 |

## 4. 功能影响（需求与功能对齐的唯一位置）

| 功能 ID | 功能名称 | 影响类型 | 说明 | 关联任务 |
|---|---|---|---|---|
| M00.F01.I01 | 当前会话（顶栏登录用户显示名） | 新增（镜像登记） | shared SSOT 已上线行的 react 镜像补漏；实现/测试已在库，不写新码 | T-1 |
