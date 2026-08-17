import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { BackendProvider } from "./state/backend-context";
import { AuthProvider } from "./state/auth-context";
import { installHttpClient } from "./api/http-client";
import { TOKEN_STORAGE_KEYS } from "./api/contracts";

// axios 拦截器：baseUrl 走 backend-config 单例，token 走契约 key lab.accessToken
installHttpClient(() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken);
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackendProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BackendProvider>
  </StrictMode>,
);
