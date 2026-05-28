# ============================================================
# CigarPro Admin — 多阶段生产构建
# ============================================================

# ---- Stage 1: 构建 ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm --registry=https://registry.npmmirror.com
RUN npm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --registry=https://registry.npmmirror.com

COPY . .
RUN pnpm run build


# ---- Stage 2: Nginx 静态服务 ----
FROM nginx:1.27-alpine AS production

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
