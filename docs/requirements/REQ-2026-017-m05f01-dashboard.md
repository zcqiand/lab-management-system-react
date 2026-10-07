# REQ-2026-017 M05.F01 仪表盘核心指标卡 + 任务状态漏斗（react）

| 项 | 值 |
|---|---|
| 提出人 | Claude（机器侧规划推进，常设指令「还有很多规划状态没有上线，请继续」） |
| 提出日期 | 2026-10-07 |
| 优先级 | P1 |
| 状态 | 开发中 |
| 关联 ADR | — |

## 1. 需求描述

用户原话（常设指令）：「还有很多规划状态没有上线，请继续，加快进程」。

理解：react 仓功能树 M05.F01.I03（核心指标卡）与 M05.F01.I04（任务状态
漏斗）仍规划态。契约面（lab-shared `GET /summary/stats` → DashboardStats）
已含全部扩展字段（todayTestCount / qualifiedRateByMaterial /
reportOutputByStatus / funnelByStage）且生成物已落仓
（src/api/endpoints/model/dashboardStats.ts）；数据服务端（nextjs
M05.F01.I03/I04 已上线）已产出。本需求 = SummaryList 仪表盘区块补齐，
镜像 nextjs 仓 SummaryPage 同名区块（I03 三卡 + I04 六段漏斗），真链路
测试直连 :5201 穿透断言。

### 澄清记录

| 疑问 | 澄清结论 | 澄清人 | 日期 |
|---|---|---|---|
| M05.F01.I05（见证取样跟踪）为何不入本切片 | 契约 DashboardStats 无 witnessStats 字段——动它=改 shared 契约，ADR-0029 人批项，机器侧 blocked | Claude | 2026-10-07 |
| UI 形状 | 镜像 nextjs SummaryPage：I03 核心指标三卡（今日试验总数/报告产出量/检测合格率）+ I04 六段漏斗（待取样→已签发），label/testid 与 nextjs 对齐 | Claude | 2026-10-07 |

## 2. 验收标准

| 编号 | 场景（给定） | 操作（当） | 预期（则） |
|---|---|---|---|
| AC-1 | 真链路 :5201 stats 含扩展字段 | 打开仪表盘 | `[data-fn="M05.F01.I03"]` 区块渲染，含「核心指标」标题与 metric-today-tests / metric-output / metric-qualified-rate 三卡 |
| AC-2 | stats.reportOutputByStatus 到达 | 观察报告产出量卡 | detail 区出现 已生成/待审核/已签发 三行数值 |
| AC-3 | stats.qualifiedRateByMaterial 到达 | 观察检测合格率卡 | 混凝土/钢筋/砂石三行，各带百分比 |
| AC-4 | stats.funnelByStage 到达 | 观察漏斗区块 | `[data-fn="M05.F01.I04"]` 渲染 6 段（待取样/已收样/试验中/报告编制/待审核/已签发）+ 各段计数 |
| AC-5 | 既有 I01/I02/I06 面 | 回归 | 既有 5 测全绿，汇总表/五卡不回归 |

## 3. 任务拆解

| 任务 ID | 任务描述 | 类型 | 负责人 | 预估 | 状态 |
|---|---|---|---|---|---|
| T-1 | REQ + 树 2 行推进开发中（mirror --apply）+ 设计映射 2 行 + 测试先行（red） | 代码 | Claude | – | 完成 |
| T-2 | SummaryList 补 I03/I04 区块转绿 | 代码 | Claude | – | 完成 |
| T-3 | prettier/eslint/tsc/vitest 全量 + trace + gate + 推送 | 代码 | Claude | – | 完成 |

## 4. 功能影响（需求与功能对齐的唯一位置）

| 功能 ID | 功能名称 | 影响类型 | 说明 | 关联任务 |
|---|---|---|---|---|
| M05.F01.I03 | 核心指标卡 | 变更 | 规划→开发中→（人工验收后）已上线；SummaryList 仪表盘三卡 | T-1/T-2 |
| M05.F01.I04 | 任务状态漏斗 | 变更 | 规划→开发中→（人工验收后）已上线；SummaryList 六段漏斗 | T-1/T-2 |

## 5. 流程影响

无（仪表盘区块为只读消费，不动 flow-function-map 流程步骤）。

## 6. 风险与回滚

| 风险 | 影响面 | 缓解 | 回滚方式 |
|---|---|---|---|
| 真链路测试环境假红（远程 PG 丢包） | L4 门 | session 指纹：轮换挂不重样=环境假红，干净窗口复跑；门禁前探 :5201 与 PG | 重跑 |
| stats 端点 401 | 测试 | globalSetup TEST_TOKEN 双通道既有机制，不新造 | – |
