-- 添加管理员登录失败计数列
-- 使用 IF NOT EXISTS 保证幂等性（兼容已通过 prisma db push 添加过该列的环境）
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "failed_attempts" INTEGER NOT NULL DEFAULT 0;
