// MSW browser worker setup for lab-react dev mode.
//
// 后端是否启用 MSW 走 env（ADR-0014 — 完全镜像 nextjs）：
//   VITE_ENABLE_MSW=false 时跳过；fetch 直走 VITE_API_BASE_URL 真后端。
//
// 旧的 runtime backend-switcher + disableMocking 反注册路径已删除
// （不再切后端，无需切时清 stale SW）。
import { setupBrowserMocks } from "@lab/management-system-msw/browser";
import { isMswEnabled } from "@/api/backend-config";

export async function enableMocking(): Promise<void> {
  if (import.meta.env.PROD) return;
  if (!isMswEnabled()) return;
  await setupBrowserMocks();
}