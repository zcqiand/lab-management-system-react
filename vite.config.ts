import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
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
