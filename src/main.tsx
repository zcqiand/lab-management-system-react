import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { BackendProvider } from "./state/backend-context";
import { AuthProvider } from "./state/auth-context";
import { installHttpClient } from "./api/http-client";
import { installLegacyClient } from "./api/legacy-client";
import { TOKEN_STORAGE_KEYS } from "./api/contracts";

// axios 拦截器（orval 全局 axios）：baseUrl 走 backend-config 单例，token 走契约 key lab.accessToken
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackendProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BackendProvider>
  </StrictMode>,
);
