// MSW browser worker setup for lab-react dev mode.
//
// 后端运行时切换：仅在 VITE_DEFAULT_BACKEND === "msw"（默认）时启用 worker。
// 切到 nextjs / aspnetcore / springboot 后，fetch 直走后端真实地址。
//
// enableMocking 在 main.tsx 启动时跑一次。**进入页面就主动扫 stale SW**——
// 上次 session 残留的 mockServiceWorker.js 必须清掉，否则它继续拦截所有
// /api/* 请求，MSW 用 mock 数据答非所问（即使 SW 已没 handler，passthrough
// 也只是把请求转发到真后端，但 stale SW 的存在本身就是污染）。
//
// 后端切换器（components/app/backend-switcher.tsx）切走时调 disableMocking
// 反注册 SW + reload——这是快速通道；enableMocking 里的 unregisterStaleMsw
// 是兜底通道，确保下次启动干净。
//
// 参考 saas-identity-platform-react/src/mocks/browser.ts（其版本没有
// unregisterStaleMsw 与 disableMocking，是这个 lab 版的升级点）。
import { setupBrowserMocks } from "@lab/management-system-msw/browser";
import { getBackend } from "@/api/backend-config";

// MSW 的 SetupWorker 实例（enableMocking 成功后赋值，disableMocking 后清空）。
// 用模块级变量持有，切换器随时能拿到；PROD 不下，所以 worker 始终 null。
type MswWorker = Awaited<ReturnType<typeof setupBrowserMocks>>;
let worker: MswWorker | null = null;

/** 主动反注册所有名为 mockServiceWorker.js 的 SW。兜底用，防止 stale 注册污染。 */
async function unregisterStaleMsw(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active?.scriptURL ?? "").includes("mockServiceWorker.js"))
      .map((r) => r.unregister()),
  );
}

export async function enableMocking(): Promise<void> {
  if (import.meta.env.PROD) return;
  if (getBackend() !== "msw") {
    // 切走后残留的 mockServiceWorker 会拦截所有 /api/*，反注册清掉。
    await unregisterStaleMsw();
    return;
  }
  // msw 模式：已有的 mockServiceWorker 正是我们要的，**不要**先反注册再重注册。
  // 重注册会触发 install→skipWaiting→activate→claim，claim 终止旧控制器 SW 的
  // 瞬间，正在被它拦截的请求（如 hydrate 的 /api/auth/me）一起蒸发、promise
  // 永远 pending——首屏卡 "检查登录态…"，刷新重跑竞态通常能赢，所以表现为
  // "刷新一下才进首页"。worker.start() 对已注册的 SW 只做 integrity check，幂等。
  worker = await setupBrowserMocks();
}

export async function disableMocking(): Promise<void> {
  if (!worker) return;
  // worker.stop() 反注册 service worker 并清掉所有 fetch handler。
  // 等其 resolve 后调用方再 reload，保证新页面的首次 fetch 不再被 SW 拦截。
  await worker.stop();
  worker = null;
}