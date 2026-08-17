// 兜底 saas post-login 把字面量字符串 "undefined" / "null" / "NaN" 拼到 URL 路径
// 直接 navigate（不走 ?from= query，sanitizeRedirect 拦不到）。
//
// 触发场景：saas 的 redirect 模板拼 `${redirect}` 但 redirect 是 undefined，
// 结果浏览器拿到 `http://lab/undefined` 而不是 `http://lab/login?from=...`。
// AppShell 的 useRequireAuth 也走 location.pathname，所以这里也拦不住。
//
// 策略：
//   - 路径首段是 "undefined" / "null" / "NaN" / "false" / "true" →
//     1) 静默 Navigate 到 / 让 useRequireAuth 触发
//     2) 同时 sessionStorage 设 lab.sso.broken=1 flag，LoginPage 读到后跳过 SSO
//        走本地表单（防止 SSO 循环 ping-pong：saas 反复 redirect /undefined）
//   - 其他 → 显示 404（用户手敲错 URL）
//
// 这是最后一道防线——sanitizeRedirect 是第一道（query 参数层）。

import { Navigate, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/app/empty-state";

const BAD_PATH_PREFIXES = new Set(["undefined", "null", "NaN", "false", "true"]);

export const SSO_BROKEN_FLAG = "lab.sso.broken";

export function markSsoBroken(): void {
  try {
    sessionStorage.setItem(SSO_BROKEN_FLAG, "1");
  } catch {
    /* sessionStorage 不可用时忽略 */
  }
}

export function clearSsoBroken(): void {
  try {
    sessionStorage.removeItem(SSO_BROKEN_FLAG);
  } catch {
    /* ignore */
  }
}

export function BadPathRedirect() {
  const location = useLocation();
  const firstSegment = location.pathname.split("/").filter(Boolean)[0] ?? "";

  if (BAD_PATH_PREFIXES.has(firstSegment)) {
    // 设 SSO loop-break flag 后跳到 /，让 useRequireAuth 把 user 引到 /login，
    // LoginPage 看到 flag 后会跳过 SSO 用本地表单。
    markSsoBroken();
    return <Navigate to="/" replace />;
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState title="404" description="页面不存在" />
    </div>
  );
}