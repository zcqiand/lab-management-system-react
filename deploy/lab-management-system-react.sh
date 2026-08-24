#!/bin/sh
# Usage: lab-management-system-react.sh <DOCKER_USERNAME> <DOCKER_PASSWORD> [VERSION]
#
# Vite SPA (nginx:alpine);HOST_PORT=8011;VPS nginx 反代 (lab-react.xiangru.uk)
# v0.2.12 起补 nginx vhost 自举段（照 saas-react 同款）—— 之前精简版从不创建
# /etc/nginx/sites-available/<domain>，首次部署后站点 404。

set -eu

USERNAME="${1:-}"
PASSWORD="${2:-}"
VERSION="${3:-latest}"
IMAGE="${USERNAME}/lab-management-system-react:${VERSION}"
BASE="/home/deploy/lab-management-system-react"
CONTAINER_NAME="lab-management-system-react"
HOST_PORT=8011

# nginx domain (react SPA 没有 CORS / cross-origin runtime env, 但 deploy 脚本
# 自举 nginx vhost 时仍要用到, 提前到 bootstrap 块之前)
NGINX_DOMAIN="${NGINX_DOMAIN:-lab-react.xiangru.uk}"
NGINX_CERT_BASENAME="${NGINX_CERT_BASENAME:-xiangru-uk}"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <DOCKER_USERNAME> <DOCKER_PASSWORD> [VERSION]" >&2
  exit 2
fi

# nginx vhost 自举（缺时创建, 不 reload —— reload 要 root）:
# 检测 /etc/nginx/sites-enabled/<NGINX_DOMAIN> 是否存在; 缺时从 nginx-vps.conf.example
# 模板渲染, 做 symlink。reload 需 sudo, 留给手工:
#   sudo nginx -t && sudo systemctl reload nginx
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_VHOST_FILE="${NGINX_SITES_AVAILABLE}/${NGINX_DOMAIN}"
NGINX_VHOST_LINK="${NGINX_SITES_ENABLED}/${NGINX_DOMAIN}"
NGINX_TEMPLATE="${BASE}/nginx-vps.conf.example"

# 拉模板（deploy/ 目录随仓库 deploy 脚本一起, 但首次拉时可能不存在, 补一下）
if [ ! -f "${NGINX_TEMPLATE}" ]; then
  echo "→ fetching nginx-vps.conf.example template"
  curl -fsSL "https://raw.githubusercontent.com/zcqiand/lab-management-system-react/refs/heads/master/deploy/nginx-vps.conf.example" -o "${NGINX_TEMPLATE}"
fi

if [ -e "${NGINX_VHOST_LINK}" ] || [ -e "${NGINX_VHOST_FILE}" ]; then
  echo "→ nginx vhost ${NGINX_VHOST_FILE} already exists, skip bootstrap"
else
  echo "→ nginx vhost missing, bootstrapping ${NGINX_VHOST_FILE} (domain=${NGINX_DOMAIN} cert=${NGINX_CERT_BASENAME})"
  # deploy 用户默认没有写 /etc/nginx/sites-available/ 的权限。`>` 重定向在 dash 下
  # 失败时 -e 不传播 → 文件静默没生成 → CI 显示 success 但站点 404。修法：先
  # 检测目录可写，否则用 sudo cp + sudo ln 提权（admin 操作走 sudoers 白名单）
  # 模板占位符形态（与 saas 系不同）：server_name <domain> + ssl <domain>.crt/.key；
  # cert 路径统一到 /etc/nginx/ssl/${NGINX_CERT_BASENAME}.{cert,key}（saas 系惯例）。
  render_vhost() {
    sed \
      -e "s/<domain>/${NGINX_DOMAIN}/g" \
      -e "s|/etc/nginx/ssl/${NGINX_DOMAIN}.crt|/etc/nginx/ssl/${NGINX_CERT_BASENAME}.cert|g" \
      -e "s|/etc/nginx/ssl/${NGINX_DOMAIN}.key|/etc/nginx/ssl/${NGINX_CERT_BASENAME}.key|g" \
      "${NGINX_TEMPLATE}"
  }
  if [ -w "${NGINX_SITES_AVAILABLE}" ]; then
    umask 022
    render_vhost > "${NGINX_VHOST_FILE}"
    echo "→ wrote ${NGINX_VHOST_FILE} (direct, deploy user has write perms)"
  else
    echo "→ ${NGINX_SITES_AVAILABLE} not writable by $(id -un); need sudo (ensure /etc/sudoers.d/deploy-nginx allows: deploy ALL=(ALL) NOPASSWD: /bin/cp /bin/ln)"
    TMP_VHOST="$(mktemp)"
    render_vhost > "${TMP_VHOST}"
    sudo cp "${TMP_VHOST}" "${NGINX_VHOST_FILE}" \
      && echo "→ wrote ${NGINX_VHOST_FILE} (via sudo cp)" \
      || { echo "→ ERROR: failed to write ${NGINX_VHOST_FILE}"; exit 1; }
    rm -f "${TMP_VHOST}"
  fi
  if [ -w "${NGINX_SITES_ENABLED}" ]; then
    ln -sf "${NGINX_VHOST_FILE}" "${NGINX_VHOST_LINK}"
    echo "→ linked ${NGINX_VHOST_LINK} (direct)"
  else
    sudo ln -sf "${NGINX_VHOST_FILE}" "${NGINX_VHOST_LINK}" \
      && echo "→ linked ${NGINX_VHOST_LINK} (via sudo ln)" \
      || { echo "→ ERROR: failed to link ${NGINX_VHOST_LINK}"; exit 1; }
  fi
  echo "→ nginx vhost created. To enable: sudo nginx -t && sudo systemctl reload nginx"
fi

echo "→ image: $IMAGE"
echo "→ docker login"
printf '%s' "$PASSWORD" | docker login -u "$USERNAME" --password-stdin

echo "→ docker pull"
docker pull "$IMAGE"

echo "→ docker stop & rm $CONTAINER_NAME"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "→ docker run"
# React 是静态 SPA —— runtime 无 env-file 注入（VITE_* 在 build 时已烤进 bundle）。
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  "$IMAGE"

docker image prune -f
docker ps --filter name="$CONTAINER_NAME"
echo "→ deploy done at $(date -u)"
