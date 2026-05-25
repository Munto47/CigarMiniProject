#!/bin/sh
set -e

echo "=========================================="
echo " CigarPro Server 启动中..."
echo "=========================================="

echo "[1/2] 执行数据库迁移..."
npx prisma migrate deploy

echo "[2/2] 启动 NestJS 服务..."
exec node dist/main
