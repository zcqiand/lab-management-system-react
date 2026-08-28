# ===== lab-management-system-react — Vite SPA production image =====
# Multi-stage: build with node:24-alpine, serve with nginx:alpine.
# 容器内监听 :80;VPS nginx 反代到 host 8011 (lab-react.xiangru.uk)。

# ---------- Stage 1: builder ----------
FROM node:24-alpine AS builder
WORKDIR /app

# 硬约束:npm 依赖一律走 npmmirror (suite root CLAUDE.md §2)
RUN npm config set registry https://registry.npmmirror.com

# alpine 默认无 git / ca-certificates,装上以 clone sibling (file: 依赖 + gen:shared)
RUN apk add --no-cache git ca-certificates

# 拉 sibling 仓（file: 依赖 + gen:shared 需要 sibling 存在）
RUN git clone --depth 1 https://github.com/zcqiand/lab-management-system-msw.git ../lab-management-system-msw \
 && git clone --depth 1 https://github.com/zcqiand/lab-management-system-shared.git ../lab-management-system-shared

COPY package.json package-lock.json ./
# 用 npm install 不是 npm ci:package.json 引用 file:../lab-management-system-msw
# (file path 版本),旧 lockfile 锁了 0.1.0 → npm ci 严格不匹配。
# npm install 按 package.json + sibling 实际版本安装,自动重写 lockfile。
# --legacy-peer-deps 兼容某些宽松 peer 依赖。
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
# VITE_* build-time 烘焙(2026-08-28 起 .env.production gitignored,Docker build
# context 里没有它):prod 值在此显式声明,语义与原 .env.production 完全一致。
# 这些是公开 URL 非 secret;改后端出口/模式时同步改这里。
ENV VITE_API_BASE_URL=https://lab-springboot.xiangru.uk
ENV VITE_SAAS_BASE_URL=https://saas-nextjs.xiangru.uk
ENV VITE_API_MODE=springboot
# prebuild hook (gen:shared) 自动跑;需要 ../lab-management-system-shared 存在。
# 用 npx vite build 而非 npm run build（= tsc --noEmit && vite build）：
# Linux 上 npm install 对 file:../lab-management-system-msw 建 symlink，
# tests 的 dynamic import 链（setup.dom → @lab/msw/node → handlers-array →
# handlers-extra → 'msw' lib）在 sibling 真路径下解析不到 node_modules →
# TS2307 → 118 条 TS7006 连锁（v0.2.8/09/10 三次踩坑）。类型检查由 CI
# test job 的 npm ci（packed copy 形态）+ tsc --noEmit 对同一 commit 全量
# 覆盖，镜像构建只管产物。
RUN npx vite build

# ---------- Stage 2: runtime ----------
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]