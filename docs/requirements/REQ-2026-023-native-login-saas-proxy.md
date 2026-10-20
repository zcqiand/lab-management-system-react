# REQ-2026-023 原生登录代理 saas IdP（家族 REQ 本仓验收记录）

> 本文档是家族级 REQ-2026-023 的**本仓验收留痕**。需求全文、方案人裁与实施过程记录的真源在
> shared 仓 `lab-management-system-shared/docs/requirements/REQ-2026-023-native-login-saas-proxy.md`，
> 本仓不复制正文，只登记与本仓相关的验收事实。

| 项 | 值 |
|---|---|
| 提出人 | zcqiand（家族 REQ） |
| 提出日期 | 2026-10-11 |
| 优先级 | P0 |
| 状态 | 已验收 |
| 关联功能 | M01.F05.I06 原生登录 |
| 关联 ADR | — |

## 1. 需求描述（摘要）

非浏览器客户端密码通道：`POST /api/auth/native-login` 请求体账密调 saas `/api/v1/auth/login`
（clientId=`lab-management`），saas 4xx→401 不透传、5xx/不可达→502 SAAS_UNAVAILABLE，lab 自家
JWT 重签，LoginResponse 契约形状不变。LAB_AUTH_DEV_PASSWORD 全家族退役。

## 2. 本仓验收事实（摘自 shared REQ §7）

- 本仓角色：SPA 无 BFF，本功能在本仓的交付物是 orval 自 shared 契约生成的 API client 绑定
  （`src/api/endpoints/auth/auth.ts` 的 `authNativeLogin` / `getAuthNativeLoginMutationOptions`），
  供需要直连后端的场景使用；原生客户端（flutter/swift）走后端端点本身，行为语义由后端仓与
  contract-test 覆盖。
- 2026-10-12 T-7：家族部署链 CI 全绿，prod 探针五后端 200/401（AC-3 ✓）；
  **AC-7 闭环：lab-flutter prod 浏览器原生登录人工验收通过**（用户确认 alice/dev123456 登录
  `https://lab-flutter.xiangru.uk` 成功）——家族七条验收标准全过，REQ-2026-023 交付完成。
- 绑定与 shared 契约的一致性由 codegen 幂等门（L4）保证；本仓 2026-10-19 补冒烟锚定
  `tests/endpoints-smoke.test.ts`（fnTest 挂 M01.F05.I06）。

## 3. GA 记账说明

M01.F05.I06 于 2026-10-19 由开发中翻已上线（mirror 免批③，凭本文档 §2 家族验收事实 + 本仓
锚定补齐）。
