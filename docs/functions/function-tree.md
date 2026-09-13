# lab-management-system-react 功能树

> 建筑工程实验室管理系统 — React 前端。consumes `lab-management-system-shared` TypeSpec SSOT。
> F 级别镜像 shared BASE 24 功能（重标前端类型），向下加 I 级子项。全部 规划（待实现）。
> **2026-08-17 sprint 0 起：前端 only 镜像仓。**
> 镜像 `lab-management-system-nextjs` 26 页 UI，**不实现 `/api` route**。
> 后端由 `lab-management-system-msw` / `lab-management-system-nextjs` 提供。
> 镜像来源：`../lab-management-system-nextjs/src/`，仅参考实现。
> 状态推进路径：规划 → 开发中 → 已上线（每条子项挂 data-fn / @entry + fnTest）。

## 模块总览

| 模块 ID | 模块名称 | 说明 | 状态 |
|---|---|---|---|
| M00 | 租户管理 | 当前用户关联租户列表、登录选租户、切换租户 | 规划 |
| M01 | 认证管理 | 权限管理（RBAC/动态菜单）、认证（登录/SSO/JWT） | 规划 |
| M02 | 资源管理 | 合同管理 | 规划 |
| M03 | 试验过程管理 | 接样 → 任务分配 → 数据录入 → 审核 → 批准 → 发放 → 归档 | 规划 |
| M04 | 基础数据 | 型号/规格/等级/牌号维护 | 规划 |
| M05 | 数据统计 | 报告汇总表 | 规划 |
| M06 | 检测能力 | 检测专项/项目/参数/标准/计算方法/技术要求/报告名称/参数界面 | 规划 |

---

## M00 租户管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M00.F01 | 当前用户会话 | （说明待补） | 已上线 |
| M00.F02 | 登录选租户 | （说明待补） | 规划 |

---

## M01 认证管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M01.F04 | 权限管理（RBAC/路由守卫/动态菜单） | 权限管理（RBAC/路由守卫/动态菜单） | 规划 |
| M01.F05 | 认证管理（登录/SSO/JWT） | 认证管理（登录/SSO/JWT） | 规划 |

### M01.F04 权限管理（RBAC/路由守卫/动态菜单）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M01.F04.I01 | 动态菜单下发（GET /auth/menus） | 查询 | 前端+后端 |  | 已上线 |
| M01.F04.I02 | 动态权限集（GET /auth/permissions） | 查询 | 前端+后端 |  | 已上线 |
| M01.F04.I03 | 路由守卫（未登录/无权限拦截） | 接口 | 前端+后端 |  | 已上线 |
| M01.F04.I04 | 动态菜单 | 接口 | 前端+后端 | 侧边栏菜单由身份平台 GET /menus?appId=lab-management 下发，按权限码显隐；分组无可见子项则隐藏 | 规划 |

### M01.F05 认证管理（登录/SSO/JWT）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M01.F05.I01 | 用户名+密码登录 | 页面 | 前端+后端 |  | 已废弃 |
| M01.F05.I02 | Token 注入与失效跳登录 | 接口 | 前端+后端 |  | 已上线 |
| M01.F05.I03 | SSO OAuth 2.0 授权码流（client_secret + lab 自家 token mint） | 接口 | 前端+后端 |  | 已上线 |
| M01.F05.I04 | 登出 | 按钮 | 前端+后端 |  | 已上线 |
| M01.F05.I05 | 登出 | 接口 | 前端+后端 | POST /api/auth/logout：无状态 JWT 服务端无 session，前端清存储 | 规划 |

---

## M02 资源管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M02.F01 | 合同管理（CRUD + 工程信息） | （说明待补） | 已上线 |

### M02.F01 合同管理（CRUD + 工程信息）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M02.F01.I01 | 合同列表（三态过滤） | 页面 | 前端+后端 |  | 已上线 |
| M02.F01.I02 | 新建/编辑合同 | 按钮 | 前端+后端 |  | 已上线 |
| M02.F01.I03 | 删除合同 | 按钮 | 前端+后端 |  | 已上线 |

---

## M03 试验过程管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M03.F01 | 接样管理（CRUD + 三态过滤） | （说明待补） | 已上线 |
| M03.F02 | 任务分配（安排检测人员/计划日期） | （说明待补） | 已上线 |
| M03.F03 | 数据录入（样品检测数据 + 人工改判） | （说明待补） | 已上线 |
| M03.F05 | 报告审核流程 | 报告审核流程 | 已上线 |
| M03.F06 | 报告批准流程 | 报告批准流程 | 已上线 |
| M03.F07 | 报告发放流程 | 报告发放流程 | 已上线 |
| M03.F08 | 报告归档流程 | 报告归档流程 | 已上线 |
| M03.F09 | 接样单详情（接样+样品+检测数据+预览） | 接样单详情（接样+样品+检测数据+预览） | 已上线 |

### M03.F01 接样管理（CRUD + 三态过滤）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F01.I01 | 接样单列表（flowStatus 三态过滤） | 页面 | 前端+后端 |  | 已上线 |
| M03.F01.I02 | 新建/编辑接样单 | 按钮 | 前端+后端 |  | 已上线 |
| M03.F01.I03 | 删除接样单 | 按钮 | 前端+后端 |  | 已上线 |
| M03.F01.I04 | 提交接样单（receiving → task_assignment） | 按钮 | 前端+后端 |  | 已上线 |
| M03.F01.I07 | 接样单 ext 字段补录 | 接口 | 前端+后端 |  | 已上线 |
| M03.F01.I06 | 接样单流程历史 | 接口 | 前端+后端 | GET /api/receipts/{id}/history：返回 FlowHistoryEntry[]（jsonb 展开为 List） | 规划 |

### M03.F02 任务分配（安排检测人员/计划日期）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F02.I01 | 任务分配队列 | 页面 | 前端+后端 |  | 已上线 |
| M03.F02.I02 | 安排/取消检测人员与计划日期 | 按钮 | 前端+后端 |  | 已上线 |
| M03.F02.I03 | 任务取消（清空分配） | 接口 | 前端+后端 | 清空 assignee/assigneeId/plannedTestDate，把已分配单子在本阶段重置为未分配（非退回接样；退回接样走 FlowStagePage 通用退回按钮） | 规划 |
| M03.F02.I04 | 任务分配三态过滤器 | 接口 | 前端+后端 | 全部/未提交/已提交：按 flowStatus 过滤任务分配列表 | 规划 |

### M03.F03 数据录入（样品检测数据 + 人工改判）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F03.I01 | 样品 + 检测数据录入页 | 页面 | 前端+后端 |  | 已上线 |
| M03.F03.I02 | 保存检测记录 | 按钮 | 前端+后端 |  | 已上线 |
| M03.F03.I03 | 人工改判 verdict | 按钮 | 前端+后端 |  | 已上线 |
| M03.F03.I04 | 更新样品 | 接口 | 前端+后端 | PUT /api/samples/{id}：PATCH 语义 | 规划 |
| M03.F03.I06 | 检测记录列表 | 接口 | 前端+后端 | GET /api/test-records?sampleId=&page=&pageSize=：tenant 收口 + sampleId 过滤 + 分页；data-fn=nextjs/react/vue 仓 test-records 页面 | 规划 |
| M03.F03.I07 | 检测记录详情 | 接口 | 前端+后端 | GET /api/test-records/{id}：返回 TestRecord | 规划 |
| M03.F03.I08 | 创建检测记录 | 接口 | 前端+后端 | POST /api/test-records：sampleId/parameterCode/requirement/result 必填；tenant 从 token claim 注入 | 规划 |
| M03.F03.I09 | 更新检测记录 | 接口 | 前端+后端 | PUT /api/test-records/{id}：PATCH 语义，未传字段保留 | 规划 |

### M03.F05 报告审核流程

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F05.I01 | 审核队列（review 阶段） | 页面 | 前端+后端 |  | 已上线 |
| M03.F05.I02 | 审核通过/驳回（submit/return） | 按钮 | 前端+后端 |  | 已上线 |
| M03.F05.I03 | 报告审核-通过/退回 | 接口 | 前端+后端 | POST /api/receipts/flow：FlowActionRequest{ids, action, operator, reason}；review 视角下 action=SUBMIT 推进到 approval / RETURN 退回 data_entry | 规划 |
| M03.F05.I04 | 报告审核三态过滤器 | 接口 | 前端+后端 | 全部/未提交/已提交：按 flowStatus 过滤报告审核列表 | 规划 |

### M03.F06 报告批准流程

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F06.I01 | 批准队列（approval 阶段） | 页面 | 前端+后端 |  | 已上线 |
| M03.F06.I02 | 批准/驳回 | 按钮 | 前端+后端 |  | 已上线 |
| M03.F06.I03 | 报告批准-批准/退回 | 接口 | 前端+后端 | POST /api/receipts/flow：approval 视角下 action=SUBMIT 推进到 issuance / RETURN 退回 review | 规划 |
| M03.F06.I04 | 报告批准三态过滤器 | 接口 | 前端+后端 | 全部/未提交/已提交：按 flowStatus 过滤报告批准列表 | 规划 |

### M03.F07 报告发放流程

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F07.I01 | 发放队列（issuance 阶段） | 页面 | 前端+后端 |  | 已上线 |
| M03.F07.I02 | 发放（生成报告编号） | 按钮 | 前端+后端 |  | 已上线 |
| M03.F07.I03 | 报告发放-发放/退回 | 接口 | 前端+后端 | POST /api/receipts/flow：issuance 视角下 action=SUBMIT 推进到 archived / RETURN 退回 approval | 规划 |
| M03.F07.I04 | 报告发放三态过滤器 | 接口 | 前端+后端 | 全部/未提交/已提交：按 flowStatus 过滤报告发放列表 | 规划 |

### M03.F08 报告归档流程

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F08.I01 | 归档队列（archived 阶段） | 页面 | 前端+后端 |  | 已上线 |
| M03.F08.I02 | 归档完成 | 按钮 | 前端+后端 |  | 已上线 |
| M03.F08.I03 | 报告归档-归档/退回 | 接口 | 前端+后端 | POST /api/receipts/flow：archived 视角下 action=SUBMIT 推进终态 / RETURN 退回 issuance | 规划 |
| M03.F08.I04 | 报告归档三态过滤器 | 接口 | 前端+后端 | 全部/未提交/已提交：按 flowStatus 过滤报告归档列表 | 规划 |

### M03.F09 接样单详情（接样+样品+检测数据+预览）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F09.I01 | 接样单详情页 | 页面 | 前端+后端 |  | 已上线 |
| M03.F09.I02 | 流程历史时间线 | 查询 | 前端+后端 |  | 已上线 |
| M03.F09.I03 | 报告预览 | 按钮 | 仅前端 |  | 已上线 |

---

## M04 基础数据

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M04.F06 | 型号维护 | 型号维护 | 已上线 |
| M04.F07 | 规格维护 | 规格维护 | 已上线 |
| M04.F08 | 等级维护 | 等级维护 | 已上线 |
| M04.F09 | 牌号维护 | 牌号维护 | 已上线 |

### M04.F06 型号维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F06.I01 | 型号列表（按专项过滤 + 拖拽排序） | 页面 | 前端+后端 |  | 已上线 |
| M04.F06.I02 | 新建/编辑型号 | 按钮 | 前端+后端 |  | 已上线 |
| M04.F06.I03 | 删除型号（引用保护） | 按钮 | 前端+后端 |  | 已上线 |

### M04.F07 规格维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F07.I01 | 规格列表 | 页面 | 前端+后端 |  | 已上线 |
| M04.F07.I02 | 新建/编辑规格 | 按钮 | 前端+后端 |  | 已上线 |
| M04.F07.I03 | 删除规格 | 按钮 | 前端+后端 |  | 已上线 |

### M04.F08 等级维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F08.I01 | 等级列表 | 页面 | 前端+后端 |  | 已上线 |
| M04.F08.I02 | 新建/编辑等级 | 按钮 | 前端+后端 |  | 已上线 |
| M04.F08.I03 | 删除等级 | 按钮 | 前端+后端 |  | 已上线 |

### M04.F09 牌号维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F09.I01 | 牌号列表 | 页面 | 前端+后端 |  | 已上线 |
| M04.F09.I02 | 新建/编辑牌号 | 按钮 | 前端+后端 |  | 已上线 |
| M04.F09.I03 | 删除牌号 | 按钮 | 前端+后端 |  | 已上线 |

---

## M05 数据统计

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M05.F01 | 报告汇总表（按报告类别） | （说明待补） | 已上线 |

### M05.F01 报告汇总表（按报告类别）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M05.F01.I01 | 报告汇总表（按报告类别汇总） | 查询 | 前端+后端 |  | 已上线 |
| M05.F01.I02 | 仪表盘统计 | 查询 | 仅前端 |  | 已上线 |
| M05.F01.I03 | 核心指标卡 | 查询 | 前端+后端 | 今日试验总数 + 检测合格率（按材料类型 concrete/rebar/sand）+ 报告产出量（已生成/已签发/待审核）；GET /api/summary/stats 扩展 todayTestCount/qualifiedRateByMaterial/reportOutputByStatus | 规划 |
| M05.F01.I04 | 任务状态漏斗 | 报表 | 前端+后端 | 6 段实时计数：待取样→已收样→试验中→报告编制→待审核→已签发；GET /api/summary/stats 扩展 funnelByStage:{pending_collect, received, testing, reporting, reviewing, issued} | 规划 |
| M05.F01.I05 | 见证取样跟踪 | 报表 | 前端+后端 | 见证率（合同需见证的接样单中已完成见证的比例）+ 见证到位情况明细；GET /api/summary/stats 扩展 witnessStats:{requireWitness, witnessed, witnessRate, details[]} | 规划 |
| M05.F01.I06 | 仪表盘统计基础端点 | 查询 | 前端+后端 | GET /api/summary/stats 基础字段：contractCount/receiptCount/sampleCount + 报告状态 3 桶（draft=receiving+task+data_entry；reviewing=review+approval；issued=issuance+archived）+ pendingTaskCount。ADR-0033 阶段二自后端仓 M05.F02.I01 改挂 F01（BASE I06 下沉对齐） | 已上线 |

---

## M06 检测能力

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M06.F01 | 检测专项维护 | （说明待补） | 已上线 |
| M06.F02 | 检测项目维护 | （说明待补） | 已上线 |
| M06.F03 | 检测参数维护 | （说明待补） | 已上线 |
| M06.F04 | 检测标准维护 | 检测标准维护 | 已上线 |
| M06.F05 | 计算方法维护 | 计算方法维护 | 已上线 |
| M06.F06 | 技术要求维护（四维度匹配） | 技术要求维护（四维度匹配） | 已上线 |
| M06.F07 | 报告名称维护 | 报告名称维护 | 已上线 |
| M06.F08 | 参数界面维护 | 参数界面维护 | 已上线 |

### M06.F01 检测专项维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F01.I01 | 检测专项列表 + CRUD | 页面 | 前端+后端 |  | 已上线 |
| M06.F01.I02 | 创建专项 | 接口 | 前端+后端 | POST /api/inspection/specialties：code/officialNo/name 必填；isOfficial/enabled 默认 true；sortOrder 默认 0 | 规划 |
| M06.F01.I03 | 更新专项 | 接口 | 前端+后端 | PUT /api/inspection/specialties/{code}：PATCH 语义，未传字段保留 | 规划 |

### M06.F02 检测项目维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F02.I01 | 检测项目列表（按专项过滤） | 页面 | 前端+后端 |  | 已上线 |
| M06.F02.I02 | 项目↔专项/参数关联 | 按钮 | 前端+后端 |  | 已上线 |
| M06.F02.I03 | 更新项目 | 接口 | 前端+后端 | PUT /api/inspection/objects/{code}：PATCH 语义 | 规划 |
| M06.F02.I04 | 删除项目 | 接口 | 前端+后端 | DELETE /api/inspection/objects/{code}：204 if exists | 规划 |
| M06.F02.I05 | 专项↔项目 link | 接口 | 前端+后端 | POST /api/inspection/links/specialty-object：建立 specialty→object 关联，remark 可选 | 规划 |
| M06.F02.I06 | 专项↔项目 unlink | 接口 | 前端+后端 | DELETE /api/inspection/links/specialty-object：404 if 不存在 | 规划 |
| M06.F02.I07 | 项目↔参数 link | 接口 | 前端+后端 | POST /api/inspection/links/object-parameter：建立 object→parameter 关联，qualificationLevel 默认 QUALIFIED，sourcePage/remark 可选 | 规划 |

### M06.F03 检测参数维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F03.I01 | 检测参数列表 + CRUD | 页面 | 前端+后端 |  | 已上线 |
| M06.F03.I02 | 参数↔标准关联 | 按钮 | 前端+后端 |  | 已上线 |
| M06.F03.I03 | 更新参数 | 接口 | 前端+后端 | PUT /api/inspection/parameters/{code}：PATCH 语义；aliases 传则整体替换 | 规划 |

### M06.F04 检测标准维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F04.I01 | 检测标准列表（状态过滤） | 页面 | 前端+后端 |  | 已上线 |
| M06.F04.I02 | 标准 CRUD | 按钮 | 前端+后端 |  | 已上线 |
| M06.F04.I03 | 更新标准 | 接口 | 前端+后端 | PUT /api/inspection/standards/{code}：PATCH 语义 | 规划 |
| M06.F04.I04 | 删除标准 | 接口 | 前端+后端 | DELETE /api/inspection/standards/{code}：204 if exists | 规划 |

### M06.F05 计算方法维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F05.I01 | 计算方法维护 | 页面 | 前端+后端 |  | 已上线 |
| M06.F05.I02 | 计算方法详情 | 接口 | 前端+后端 | GET /api/calculation-methods/{inspectionObjectCode}/{inspectionParameterCode}：复合主键 | 规划 |
| M06.F05.I03 | 创建计算方法 | 接口 | 前端+后端 | POST /api/calculation-methods：body CreateCalculationMethodRequest，algorithmType 默认 MANUAL、specimenCount 默认 1 | 规划 |

### M06.F06 技术要求维护（四维度匹配）

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F06.I01 | 技术要求列表（多维过滤） | 页面 | 前端+后端 |  | 已上线 |
| M06.F06.I02 | 新建/编辑技术要求 | 按钮 | 前端+后端 |  | 已上线 |
| M06.F06.I03 | 删除技术要求（引用保护） | 按钮 | 前端+后端 |  | 已上线 |

### M06.F07 报告名称维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F07.I01 | 报告名称列表 + extFields 模板 | 页面 | 前端+后端 |  | 已上线 |
| M06.F07.I02 | 报告名称↔标准/参数关联 | 按钮 | 前端+后端 |  | 已上线 |
| M06.F07.I03 | 创建报告名称 | 接口 | 前端+后端 | POST /api/report-names：code/name 必填；extFields 默认 [] | 规划 |
| M06.F07.I04 | 更新报告名称 | 接口 | 前端+后端 | PUT /api/report-names/{code}：PATCH 语义 | 规划 |
| M06.F07.I05 | 删除报告名称 | 接口 | 前端+后端 | DELETE /api/report-names/{code}：204 if exists | 规划 |
| M06.F07.I06 | 项目↔报告名称 link | 接口 | 前端+后端 | POST /api/report-names/links/object：建立 object→report-name 关联，remark 可选 | 规划 |
| M06.F07.I07 | 报告名称↔标准 link | 接口 | 前端+后端 | POST /api/report-names/links/standard：建立 report-name→standard(role) 关联，role 必填 | 规划 |
| M06.F07.I08 | 报告名称↔参数 link | 接口 | 前端+后端 | POST /api/report-names/links/parameter：建立 report-name→parameter 关联 | 规划 |

### M06.F08 参数界面维护

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F08.I01 | 参数界面维护 + link | 页面 | 前端+后端 |  | 已上线 |
| M06.F08.I02 | 参数界面详情 | 接口 | 前端+后端 | GET /api/param-interfaces/{code}：返回 ParamInterface（含 config 反序列化的 Map<String,Object>） | 规划 |
| M06.F08.I03 | 创建参数界面 | 接口 | 前端+后端 | POST /api/param-interfaces：code/componentPath 必填；config 默认 {} | 规划 |
| M06.F08.I04 | 更新参数界面 | 接口 | 前端+后端 | PUT /api/param-interfaces/{code}：PATCH 语义 | 规划 |
| M06.F08.I05 | 删除参数界面 | 接口 | 前端+后端 | DELETE /api/param-interfaces/{code}：204 if exists | 规划 |
| M06.F08.I06 | 参数↔界面 link | 接口 | 前端+后端 | POST /api/param-interfaces/links：建立 parameter→interface 关联，reportNameCode/config 可选（config 走 jsonb） | 规划 |

---
