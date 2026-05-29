#!/bin/sh
set -e

echo "=========================================="
echo " CigarPro Server 启动中..."
echo "=========================================="

echo "[1/3] 执行数据库迁移..."
node_modules/.bin/prisma migrate deploy

echo "[2/3] 初始化基础种子数据（幂等）..."
node prisma/run-init.js

echo "[3/3] 启动 NestJS 服务..."
exec node dist/main
