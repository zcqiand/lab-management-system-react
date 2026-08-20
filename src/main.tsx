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

// MSW dev bootstrap：mocks/browser.enableMocking() 在 VITE_DEFAULT_BACKEND=msw 时
// 注册 service worker（public/mockServiceWorker.js），拦截 /api/* 全部请求。
// 切到 nextjs/springboot/aspnetcore 时跳过，走真实后端。
async function bootstrap() {
  if (import.meta.env.DEV) {
    // 必须先从 localStorage hydrate backend 单例再决定是否注册 MSW SW。
    // 否则 getBackend() 停在 env 默认 msw：切到 aspnetcore 等真后端的用户
    // reload 后 SW 被错误注册回来，/api/* 与页面导航全被拦截。
    const { hydrateBackendFromStorage } = await import("./api/backend-config");
    hydrateBackendFromStorage();
    const { enableMocking } = await import("./mocks/browser");
    await enableMocking();
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BackendProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BackendProvider>
    </StrictMode>,
  );
}

void bootstrap();
