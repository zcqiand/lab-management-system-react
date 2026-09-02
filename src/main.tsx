import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./state/auth-context";
import { installHttpClient } from "./api/http-client";
import { installLegacyClient } from "./api/legacy-client";
import { TOKEN_STORAGE_KEYS } from "./api/contracts";

// axios 拦截器（orval 全局 axios）：baseUrl 走 env（VITE_API_BASE_URL），
// token 走契约 key lab.accessToken。
installHttpClient(() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken);
  } catch {
    return null;
  }
});

// legacy-client（features 层数据获取）：token 同源桥接；401 时清持久化落 anonymous
// （不在此直接跳路由 — FSM 状态变化由 useRequireAuth 守卫消费并重定向）
installLegacyClient(
  () => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken);
    } catch {
      return null;
    }
  },
  () => {
    for (const key of Object.values(TOKEN_STORAGE_KEYS)) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  },
);

// ADR-0012 v0.3.0：删除 SW bootstrap（Service Worker 模式完全删除）。
// dev 路径走 msw-http 独立 HTTP server（@lab/management-system-msw/src/server.ts 起 :5200）。
async function bootstrap() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

void bootstrap();