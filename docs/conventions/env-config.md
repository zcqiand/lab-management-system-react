# 环境变量配置

> lab-management-system-react 的 dev / 部署期配置走 `.env` 文件，集中在 `src/lib/env.ts` 读 `import.meta.env.VITE_*`。

## 关键约束

- **.env.local** 不要提交（`.gitignore` 已盖）
- **.env.example** 是提交模板（开发者 `cp .env.example .env.local`）
- 修改后必须 **重启 vite**（Vite 在启动 phase 注入 env，运行时改 env 不生效）

## 可用变量

| 变量 | 默认 | 用途 |
|---|---|---|
| `VITE_DEV_PORT` | `5173` | vite dev server 端口（同时 `process.env.VITE_DEV_PORT` 走 vite.config.ts） |
| `VITE_DEFAULT_BACKEND` | `msw` | 启动激活后端（`msw` / `nextjs` / `aspnetcore` / `springboot`） |
| `VITE_BACKEND_URL_MSW` | `""`（同源） | MSW mock 后端 baseUrl |
| `VITE_BACKEND_URL_NEXTJS` | `""`（同源） | Next.js API routes baseUrl |
| `VITE_BACKEND_URL_ASPNETCORE` | `http://localhost:5000` | ASP.NET Core 后端 baseUrl |
| `VITE_BACKEND_URL_SPRINGBOOT` | `http://localhost:8080` | Spring Boot 后端 baseUrl |
| `VITE_SAAS_BASE_URL` | `http://localhost:3000` | SSO 跳转 saas 地址（前端用） |
| `SAAS_BASE_URL` | `http://localhost:3000` | SSO 跳转 saas 地址（msw handler 用，node-side） |

## 消费点

- `src/lib/env.ts` — 单一读取入口（带默认值兜底）
- `src/api/backend-config.ts` — `DEFAULT_BASE_URLS` + 启动后端默认值
- `src/api/contracts.ts` — `BACKEND_REGISTRY_DEFAULT.available[].baseUrl`
- `src/components/app/backend-switcher.tsx` — Input placeholder
- `vite.config.ts` — dev server port

## 边界与守卫

- 空字符串视为未设，回退默认值（避免 `${undefined}` 渲染问题）
- 单元测试用 `vi.stubEnv` 注入 + `vi.resetModules()` 重新 import（见 `tests/lib/env.test.ts`）

## 部署期

- 开发：cp `.env.example` 到 `.env.local` 后改
- 测试/CI：.env 由 CI 配置注入
- 生产：部署平台（Vercel / Netlify / 自托管）设置同名变量