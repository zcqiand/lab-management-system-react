import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// VITE_DEV_PORT 在 vite.config.ts 加载时由 Vite 注入到 import.meta.env（早期 phase）；
// 这里直接读 process.env 兜底；dev port 走 .env.local。
const devPort = Number(process.env.VITE_DEV_PORT ?? '5173') || 5173

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: devPort,
    open: true,
    // vite 8.2.1 已知问题：默认 forwardConsole: void 0 走 agent 检测路径，
    // escapeReplacement(JSON.stringify(undefined)) 返回 undefined → 替换 no-op，
    // 浏览器拿到 `const forwardConsole = __SERVER_FORWARD_CONSOLE__` →
    // ReferenceError。显式关掉走 JSON-serializable 的 false 分支即可修复。
    forwardConsole: false,
  },
  optimizeDeps: {
    // msw v2 has unresolvable @mswjs/interceptors exports conditions for
    // ClientRequest in browser; exclude from pre-bundling so it loads at
    // runtime without vite choking on it.
    exclude: ['@lab/management-system-msw', 'msw', '@mswjs/interceptors'],
  },
})
