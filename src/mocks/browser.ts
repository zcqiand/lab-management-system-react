// MSW browser worker setup for lab-react dev mode.
//
// 后端运行时切换：仅在 VITE_DEFAULT_BACKEND === "msw"（默认）时启用 worker。
// 切到 nextjs / aspnetcore / springboot 后，fetch 直走后端真实地址。
//
// 参考 saas-identity-platform-react/src/mocks/browser.ts 镜像实现。
import { setupBrowserMocks } from "@lab/management-system-msw/browser";
import { getBackend } from "@/api/backend-config";

export async function enableMocking() {
  if (import.meta.env.PROD) return;
  if (getBackend() !== "msw") return;
  await setupBrowserMocks();
}