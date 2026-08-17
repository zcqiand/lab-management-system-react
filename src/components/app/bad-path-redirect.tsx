// 兜底 saas post-login 把字面量字符串 "undefined" / "null" / "NaN" 拼到 URL 路径
// 直接 navigate（不走 ?from= query，sanitizeRedirect 拦不到）。
//
// 触发场景：saas 的 redirect 模板拼 `${redirect}` 但 redirect 是 undefined，
// 结果浏览器拿到 `http://lab/undefined` 而不是 `http://lab/login?from=...`。
// AppShell 的 useRequireAuth 也走 location.pathname，所以这里也拦不住。
//
// 策略：
//   - 路径首段是 "undefined" / "null" / "NaN" / 空 → 静默 Navigate 到 /
//   - 其他 → 显示 404（用户手敲错 URL）
//
// 这是最后一道防线——sanitizeRedirect 是第一道（query 参数层）。

import { Navigate, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/app/empty-state";

const BAD_PATH_PREFIXES = new Set(["undefined", "null", "NaN", "false", "true"]);

export function BadPathRedirect() {
  const location = useLocation();
  const firstSegment = location.pathname.split("/").filter(Boolean)[0] ?? "";

  if (BAD_PATH_PREFIXES.has(firstSegment)) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState title="404" description="页面不存在" />
    </div>
  );
}