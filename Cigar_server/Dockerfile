# ============================================================
# CigarPro Server — 多阶段生产构建
# ============================================================

# ---- Stage 1: 构建 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm，并切换到淘宝镜像加速
RUN npm install -g pnpm --registry=https://registry.npmmirror.com && \
    npm config set registry https://registry.npmmirror.com

# 仅复制依赖清单，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml .npmrc ./

# 安装全部依赖（shamefully-hoist 在 .npmrc 中已配置）
RUN pnpm install --no-frozen-lockfile

# 复制源码
COPY . .

# 生成 Prisma Client
RUN node_modules/.bin/prisma generate

# 编译 TypeScript
RUN pnpm run build

# 裁剪为仅生产依赖
RUN pnpm prune --prod --no-optional


# ---- Stage 2: 生产运行 ----
FROM node:20-alpine AS production
WORKDIR /app

# dumb-init 避免僵尸进程
RUN apk add --no-cache dumb-init

# 从构建阶段复制必要文件
COPY --from=builder /app/dist             ./dist
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/package.json     ./package.json
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/.npmrc           ./.npmrc

# 复制启动脚本并修正 Windows CRLF 换行符
COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r//' ./entrypoint.sh && chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./entrypoint.sh"]
