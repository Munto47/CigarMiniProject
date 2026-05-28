# ============================================================
# CigarPro Server — 多阶段生产构建
# ============================================================

# ---- Stage 1: 构建 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm，并切换到淘宝镜像加速
RUN npm install -g pnpm --registry=https://registry.npmmirror.com
RUN npm config set registry https://registry.npmmirror.com

# 仅复制依赖清单，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml ./

# 安装全部依赖（含 devDeps，构建需要）
RUN pnpm install --no-frozen-lockfile --registry=https://registry.npmmirror.com

# 复制源码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

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
COPY --from=builder /app/dist            ./dist
COPY --from=builder /app/node_modules    ./node_modules
COPY --from=builder /app/package.json    ./package.json
COPY --from=builder /app/prisma          ./prisma

# 复制启动脚本
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./entrypoint.sh"]
