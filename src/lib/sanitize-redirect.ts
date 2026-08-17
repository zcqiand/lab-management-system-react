// 把 ?from= / redirect= 等 query 兜底成 lab 内部绝对路径。
//
// 防御 saas post-login 把字面量字符串 "undefined" 当 redirect 路径
// （历史上 saas 拼 URL 模板时 `${redirect}` 渲染成 "undefined"，
// lab 收到 `http://localhost:5173/undefined` 路由 404）。
//
// 规则：
//   - null / undefined / 空串 / 字面量 "undefined" / "null" → "/"
//   - 非 "/" 开头的相对路径（避免 saas 把 redirect 拼成外部 URL）→ "/"
//   - 含 "//" 的（协议相对 URL //evil.com）→ "/"
//   - 通过校验：原样返回（登录成功后回跳）

export function sanitizeRedirect(from: string | null | undefined): string {
  if (!from || from === "undefined" || from === "null") return "/";
  if (!from.startsWith("/")) return "/";
  if (from.startsWith("//")) return "/";
  return from;
}