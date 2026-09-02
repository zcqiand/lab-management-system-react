import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// VITE_DEV_PORT 在 vite.config.ts 加载时由 Vite 注入到 import.meta.env（早期 phase）；
// 这里直接读 process.env 兜底；dev port 走 .env.local。
const devPort = Number(process.env.VITE_DEV_PORT ?? '5202') || 5202

// Vite proxy 解决 dev 期 CORS：lab 仓 (5202) 浏览器 fetch /api/saas/* 同源 →
// Vite dev server 转发到 saas (3000)，浏览器看不到 CORS preflight。
// 路径 rewrite：去掉 /saas 段，匹配 saas 真实 endpoint。
// lab-msw handlers 里的 /api/saas/* 已删除，避免与 proxy 双重响应。
const saasBaseUrl = process.env.SAAS_BASE_URL ?? process.env.VITE_SAAS_BASE_URL ?? 'http://localhost:5101'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    port: devPort,
    open: true,
    // vite 8.2.1 已知问题：默认 forwardConsole: void 8 走 agent 检测路径，
    // escapeReplacement(JSON.stringify(undefined)) 返回 undefined → 替换 no-op，
    // 浏览器拿到 `const forwardConsole = __SERVER_FORWARD_CONSOLE__` →
    // ReferenceError。显式关掉走 JSON-serializable 的 false 分支即可修复。
    forwardConsole: false,
    proxy: {
      // 浏览器 → 同源 /api/saas/* → Vite dev server → saas 真实 /api/v1/*
      // 例 GET /api/saas/me/menus?appCode=lab-management
      //  → GET http://localhost:5101/api/v1/me/menus?appCode=lab-management
      '/api/saas': {
        target: saasBaseUrl,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/saas/, '/api/v1'),
      },
    },
  },
  optimizeDeps: {
    // msw v2 has unresolvable @mswjs/interceptors exports conditions for
    // ClientRequest in browser; exclude from pre-bundling so it loads at
    // runtime without vite choking on it.
    exclude: ['@lab/management-system-msw', 'msw', '@mswjs/interceptors'],
  },
})
