# 设计与功能对齐 — 建筑工程实验室管理系统React前端

> 人填、人评审。机器只检查功能 ID 存在性。
> 回答一个问题：**这个功能子项，落到哪段代码、哪张表、哪个权限码上？**
> 答不上来的行，说明设计没做完，别开工。

## 映射表

| 功能子项 ID | 页面/组件 | 接口 | 数据表 | 权限码 | 设计稿 | 状态 |
|---|---|---|---|---|---|---|
| M01.F04.I01 | src/components/app/sidebar-nav.tsx | static MENU_TREE (legacy: GET /api/auth/menus) | – | M01.F04.I01 | – | 已上线 |
| M01.F04.I02 | src/state/auth-context.tsx (fetchPermissions) | GET /api/auth/permissions | – | M01.F04.I02 | – | 已上线 |
| M01.F04.I03 | src/state/require-auth.ts (useRequireAuth) | – (客户端守卫，无 API) | – | M01.F04.I03 | – | 已上线 |
| M01.F05.I02 | src/api/legacy-client.ts | – (axios Bearer + 401-bridge 拦截器) | – | M01.F05.I02 | – | 已上线 |
| M01.F05.I03 | src/state/auth-context.tsx (ssoCallback) ; src/pages/LoginPage.tsx (orchestrator) | GET /api/auth/sso/authorize?response_type=code&client_id=...&redirect_uri=...&state=... ; POST /api/auth/sso/callback {grant_type:authorization_code, code, redirect_uri} ; GET /api/auth/me | – | M01.F05.I03 | – | 已上线 |
| M01.F05.I04 | src/components/app/app-shell.tsx (header logout button) | POST /api/auth/logout | – | M01.F05.I04 | – | 已上线 |
| M02.F01.I01 | src/features/contracts/ContractsList.tsx (table row) | GET /api/contracts | contracts | M02.F01.I01 | – | 已上线 |
| M02.F01.I02 | src/features/contracts/ContractsList.tsx (新建 + 编辑) | POST /api/contracts ; PUT /api/contracts/:id | contracts | M02.F01.I02 | – | 已上线 |
| M02.F01.I03 | src/features/contracts/ContractsList.tsx (行内 删除) | DELETE /api/contracts/:id | contracts | M02.F01.I03 | – | 已上线 |
| M03.F01.I01 | src/features/receipts/ReceiptsList.tsx (table row) | GET /api/receipts?flowStatus=... | sample_receipts | M03.F01.I01 | – | 已上线 |
| M03.F01.I02 | src/features/receipts/ReceiptsList.tsx (新建 / 编辑) | POST /api/receipts ; PUT /api/receipts/:id | sample_receipts | M03.F01.I02 | – | 已上线 |
| M03.F01.I03 | src/features/receipts/ReceiptsList.tsx (行内 删除) | DELETE /api/receipts/:id | sample_receipts | M03.F01.I03 | – | 已上线 |
| M03.F01.I04 | src/features/receipts/ReceiptsList.tsx (行内 提交) | POST /api/receipts/flow (action=submit) | sample_receipts | M03.F01.I04 | – | 已上线 |
| M03.F01.I07 | src/features/data-entry/SampleExtFieldsModal.tsx (弹窗) | PUT /api/samples/:id (ext JSON) | samples | M03.F01.I07 | – | 已上线 |
| M03.F02.I01 | src/features/task-assignment/TaskAssignmentList.tsx (page header) | GET /api/receipts?flowStatus=task_assignment | sample_receipts | M03.F02.I01 | – | 已上线 |
| M03.F02.I02 | src/features/task-assignment/TaskAssignmentList.tsx (行内 安排) | PUT /api/receipts/:id (assigneeName + plannedTestDate) | sample_receipts | M03.F02.I02 | – | 已上线 |
| M03.F03.I01 | src/features/data-entry/DataEntryPage.tsx (page header) | GET /api/receipts?flowStatus=data_entry ; GET /api/samples ; GET /api/inspection-parameters ; GET /api/test-records | test_records | M03.F03.I01 | – | 已上线 |
| M03.F03.I02 | src/features/data-entry/DataEntryPage.tsx (弹窗内 保存 button) | POST /api/test-records ; PUT /api/test-records/:id | test_records | M03.F03.I02 | – | 已上线 |
| M03.F03.I03 | src/features/data-entry/DataEntryPage.tsx + models/ParticleGradationCard.tsx + models/SoilCompactionCard.tsx + models/SoilCompactionDegreeCard.tsx (verdict 改判) | – (本地状态，进入 M03.F03.I02 save 时落库) | test_records | M03.F03.I03 | – | 已上线 |
| M03.F05.I01 | src/features/reports/ReportPhasePage.tsx (rendered via src/pages/ReportReviewPage.tsx) | GET /api/receipts?flowStatus=review | sample_receipts | M03.F05.I01 | – | 已上线 |
| M03.F05.I02 | src/features/reports/ReportPhasePage.tsx (批量 审核通过/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F05.I02 | – | 已上线 |
| M03.F06.I01 | src/features/reports/ReportPhasePage.tsx (via src/pages/ReportApprovePage.tsx) | GET /api/receipts?flowStatus=approval | sample_receipts | M03.F06.I01 | – | 已上线 |
| M03.F06.I02 | src/features/reports/ReportPhasePage.tsx (批量 批准通过/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F06.I02 | – | 已上线 |
| M03.F07.I01 | src/features/reports/ReportPhasePage.tsx (via src/pages/ReportIssuePage.tsx) | GET /api/receipts?flowStatus=issuance | sample_receipts | M03.F07.I01 | – | 已上线 |
| M03.F07.I02 | src/features/reports/ReportPhasePage.tsx (批量 发放/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F07.I02 | – | 已上线 |
| M03.F08.I01 | src/features/reports/ReportPhasePage.tsx (via src/pages/ReportArchivePage.tsx) | GET /api/receipts?flowStatus=archived | sample_receipts | M03.F08.I01 | – | 已上线 |
| M03.F08.I02 | src/features/reports/ReportPhasePage.tsx (批量 归档完成/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F08.I02 | – | 已上线 |
| M03.F09.I01 | src/features/receipts/ReceiptDetail.tsx (详情 card) | GET /api/receipts/:id | sample_receipts | M03.F09.I01 | – | 已上线 |
| M03.F09.I02 | src/features/receipts/ReceiptDetail.tsx (流程历史 card) | GET /api/receipts/:id (含 flowHistory[]) | sample_receipts | M03.F09.I02 | – | 已上线 |
| M03.F09.I03 | src/features/receipts/ReceiptDetail.tsx (报告预览 button) | – (本地渲染，复用缓存 receipt) | sample_receipts | M03.F09.I03 | – | 已上线 |
| M04.F06.I01 | src/features/dicts/CategoryDictList.tsx (via src/pages/ModelsPage.tsx) | GET /api/catalog/models?inspectionObjectCode=... ; GET /api/inspection-objects | inspection_models | M04.F06.I01 | – | 已上线 |
| M04.F06.I02 | src/features/dicts/CategoryDictList.tsx (via ModelsPage; 新建 + 编辑) | POST /api/catalog/models ; PUT /api/catalog/models/:id | inspection_models | M04.F06.I02 | – | 已上线 |
| M04.F06.I03 | src/features/dicts/CategoryDictList.tsx (via ModelsPage; 行内 删除) | DELETE /api/catalog/models/:id | inspection_models | M04.F06.I03 | – | 已上线 |
| M04.F07.I01 | src/features/dicts/CategoryDictList.tsx (via src/pages/SpecificationsPage.tsx) | GET /api/catalog/specs?inspectionObjectCode=... | inspection_specs | M04.F07.I01 | – | 已上线 |
| M04.F07.I02 | src/features/dicts/CategoryDictList.tsx (via SpecificationsPage; 新建 + 编辑) | POST /api/catalog/specs ; PUT /api/catalog/specs/:id | inspection_specs | M04.F07.I02 | – | 已上线 |
| M04.F07.I03 | src/features/dicts/CategoryDictList.tsx (via SpecificationsPage; 行内 删除) | DELETE /api/catalog/specs/:id | inspection_specs | M04.F07.I03 | – | 已上线 |
| M04.F08.I01 | src/features/dicts/CategoryDictList.tsx (via src/pages/GradesPage.tsx) | GET /api/catalog/grades?inspectionObjectCode=... | inspection_grades | M04.F08.I01 | – | 已上线 |
| M04.F08.I02 | src/features/dicts/CategoryDictList.tsx (via GradesPage; 新建 + 编辑) | POST /api/catalog/grades ; PUT /api/catalog/grades/:id | inspection_grades | M04.F08.I02 | – | 已上线 |
| M04.F08.I03 | src/features/dicts/CategoryDictList.tsx (via GradesPage; 行内 删除) | DELETE /api/catalog/grades/:id | inspection_grades | M04.F08.I03 | – | 已上线 |
| M04.F09.I01 | src/features/dicts/CategoryDictList.tsx (via src/pages/BrandsPage.tsx) | GET /api/catalog/brands?inspectionObjectCode=... | inspection_brands | M04.F09.I01 | – | 已上线 |
| M04.F09.I02 | src/features/dicts/CategoryDictList.tsx (via BrandsPage; 新建 + 编辑) | POST /api/catalog/brands ; PUT /api/catalog/brands/:id | inspection_brands | M04.F09.I02 | – | 已上线 |
| M04.F09.I03 | src/features/dicts/CategoryDictList.tsx (via BrandsPage; 行内 删除) | DELETE /api/catalog/brands/:id | inspection_brands | M04.F09.I03 | – | 已上线 |
| M05.F01.I01 | src/features/summary/SummaryList.tsx (汇总表 root) | GET /api/summary?categoryCode=... ; GET /api/report-names (下拉) | sample_receipts | M05.F01.I01 | – | 已上线 |
| M05.F01.I02 | src/features/summary/SummaryList.tsx (仪表盘卡片 grid) | GET /api/summary/stats | – (跨 sample_receipts/contracts 聚合) | M05.F01.I02 | – | 已上线 |
| M06.F01.I01 | src/features/inspection-capability/InspectionCapabilityList.tsx (via src/pages/SpecialtiesPage.tsx) | GET /api/inspection-specialties | inspection_specialty | M06.F01.I01 | – | 已上线 |
| M06.F02.I01 | src/features/inspection-capability/InspectionCapabilityList.tsx (via src/pages/ObjectsPage.tsx) | GET /api/inspection-objects?inspectionSpecialtyCode=... | inspection_object | M06.F02.I01 | – | 已上线 |
| M06.F02.I02 | src/features/inspection-capability/InspectionCapabilityList.tsx (via ObjectsPage; 新建 + 编辑，form 选专项/参数) | POST /api/inspection-objects ; PUT /api/inspection-objects/:id | inspection_object | M06.F02.I02 | – | 已上线 |
| M06.F03.I01 | src/features/inspection-capability/InspectionCapabilityList.tsx (via src/pages/ParametersPage.tsx) | GET /api/inspection-parameters?inspectionSpecialtyCode=...&inspectionObjectCode=...&inspectionStandardCode=... | inspection_parameter | M06.F03.I01 | – | 已上线 |
| M06.F03.I02 | src/features/inspection-capability/InspectionCapabilityList.tsx + ParameterStandardLinkDialog.tsx (parameters 行内 关联标准 toggle) | POST /api/inspection-standard-parameters ; DELETE 同 | inspection_parameter | M06.F03.I02 | – | 已上线 |
| M06.F04.I01 | src/features/inspection-capability/InspectionCapabilityList.tsx (via src/pages/StandardsPage.tsx) | GET /api/inspection-standards?inspectionSpecialtyCode=...&inspectionObjectCode=... | inspection_standard | M06.F04.I01 | – | 已上线 |
| M06.F04.I02 | src/features/inspection-capability/InspectionCapabilityList.tsx (via StandardsPage; standards CRUD) | POST /api/inspection-standards ; PUT /api/inspection-standards/:id ; DELETE /api/inspection-standards/:id | inspection_standard | M06.F04.I02 | – | 已上线 |
| M06.F05.I01 | src/features/inspection-capability/CalculationRuleList.tsx (via src/pages/CalculationRulesPage.tsx) | GET /api/inspection-calculation-rules ; POST/PUT/DELETE 同 | inspection_calculation_rule | M06.F05.I01 | – | 已上线 |
| M06.F06.I01 | src/features/inspection-capability/TechnicalRequirementList.tsx (via src/pages/TechnicalRequirementsPage.tsx) | GET /api/inspection-technical-requirements | inspection_technical_requirement | M06.F06.I01 | – | 已上线 |
| M06.F06.I02 | src/features/inspection-capability/TechnicalRequirementList.tsx (新建 + 编辑) | POST /api/inspection-technical-requirements ; PUT /api/inspection-technical-requirements/:id | inspection_technical_requirement | M06.F06.I02 | – | 已上线 |
| M06.F06.I03 | src/features/inspection-capability/TechnicalRequirementList.tsx (行内 删除) | DELETE /api/inspection-technical-requirements/:id | inspection_technical_requirement | M06.F06.I03 | – | 已上线 |
| M06.F07.I01 | src/features/report-names/ReportNameList.tsx (via src/pages/ReportNamesPage.tsx) | GET /api/inspection-report-names ; POST/PUT/DELETE 同 | inspection_report_name | M06.F07.I01 | – | 已上线 |
| M06.F07.I02 | src/features/report-names/ReportNameList.tsx + ReportNameLinkDialog.tsx (行内 关联 button) | POST /api/inspection-report-name-standards ; DELETE 同 ; POST /api/inspection-report-name-parameters ; DELETE 同 | inspection_report_name_standard + inspection_report_name_parameter | M06.F07.I02 | – | 已上线 |
| M06.F08.I01 | src/features/param-interfaces/ParamInterfaceList.tsx (via src/pages/ParamInterfacesPage.tsx) | GET /api/inspection-param-interfaces ; POST/PUT/DELETE 同 | inspection_param_interface | M06.F08.I01 | – | 已上线 |
| M98.F01.I01 | src/components/app/backend-switcher.tsx (dropdown trigger) | – (UI 下拉；useBackend) | – | M98.F01.I01 | – | 已上线 |
| M98.F01.I02 | src/state/backend-context.tsx (useBackend.setBaseUrl) | – (localStorage[lab.backend]) | – | M98.F01.I02 | – | 已上线 |
| M98.F02.I01 | src/api/legacy-client.ts (apiClient interceptors) + src/api/http-client.ts | – (axios Bearer + 401-bridge 拦截器) | – | M98.F02.I01 | – | 已上线 |
| M98.F03.I01 | tests/endpoints-smoke.test.ts | – (validation: orval 端点函数存在性) | – | M98.F03.I01 | – | 已上线 |

## 约定

1. **权限码 = 功能子项 ID。** 前端按钮的权限判断直接写 ID。
2. 一个接口服务多个子项时，多行重复写。不要为表好看而合并 —— 合并后看不清接口还有没有别的调用方。
3. 状态列必须与功能清单一致。不一致以功能清单为准。

## 评审时问这三个问题

1. 有没有子项没有权限码？→ 那它就是任何人都能点的按钮
2. 有没有一张表被三个以上模块直接写入？→ 边界破了
3. 「开发中」的行里接口和表填了吗？→ 没填就是还在纸上，别报进度
