# CigarPro 部署文档

## 目录
1. [环境要求](#1-环境要求)
2. [首次部署（服务器）](#2-首次部署服务器)
3. [更新部署](#3-更新部署)
4. [本地开发部署](#4-本地开发部署)
5. [架构说明](#5-架构说明)
6. [启动流程说明](#6-启动流程说明)
7. [常见故障排查](#7-常见故障排查)
8. [历史修复记录](#8-历史修复记录)

---

## 1. 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Docker | ≥ 24.0 | `docker --version` |
| Docker Compose Plugin | ≥ 2.20 | `docker compose version`（注意无连字符） |
| 服务器内存 | ≥ 2 GB | 各容器内存限制之和约 1.4 GB |
| 服务器磁盘 | ≥ 20 GB | 镜像 + 数据卷 |

---

## 2. 首次部署（服务器）

### 2.1 克隆代码

```bash
git clone <仓库地址> CigarPro
cd CigarPro
```

### 2.2 配置环境变量

```bash
cp .env.production.example .env
```

编辑 `.env`，填入所有真实配置（参考文件内注释）。**必须修改的字段：**

| 字段 | 说明 | 生成命令 |
|------|------|----------|
| `POSTGRES_PASSWORD` | 数据库密码，至少16位 | `openssl rand -hex 16` |
| `REDIS_PASSWORD` | Redis 密码，至少16位 | `openssl rand -hex 16` |
| `JWT_ACCESS_SECRET` | JWT 签名密钥，至少64位 | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥，至少64位 | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 手机号加密密钥，32字节 | `openssl rand -hex 32` |
| `WECHAT_APP_ID` | 微信小程序 AppID | 微信开放平台获取 |
| `WECHAT_APP_SECRET` | 微信小程序 AppSecret | 微信开放平台获取 |
| `WECHAT_MCH_ID` | 微信支付商户号 | 微信支付平台 |
| `WECHAT_API_V3_KEY` | 微信支付 API v3 密钥 | 微信支付平台设置 |
| `WECHAT_NOTIFY_URL` | 支付回调地址 | `https://你的域名/api/payment/wechat-callback` |

### 2.3 构建并启动

```bash
docker compose up -d --build
```

构建时间约 5-10 分钟（首次拉取镜像较慢）。**服务器在国内时会自动使用淘宝 npm 镜像加速。**

### 2.4 验证部署

```bash
# 查看所有容器状态（应全部 healthy）
docker compose ps

# 测试健康接口
curl http://localhost/api/health
# 期望：{"code":0,"message":"success","data":{"status":"ok","db":"connected",...}}
```

### 2.5 首次登录

打开浏览器访问 `http://服务器IP`（或配置好域名后访问 `https://域名`）

- 账号：`admin`
- 密码：`admin123`

> ⚠️ **首次登录后请立即修改密码！**
> 账号管理 → 超级管理员 → 修改密码

---

## 3. 更新部署

### 代码更新

```bash
git pull
docker compose up -d --build
```

Compose 只会重建有变化的镜像，**数据卷（数据库/Redis/MinIO）不会被清空**。

### 只重建某个服务

```bash
# 只重建后端（最常见）
docker compose build server && docker compose up -d server

# 只重建管理后台前端
docker compose build admin && docker compose up -d admin
```

### 查看实时日志

```bash
# 所有服务
docker compose logs -f

# 只看后端
docker compose logs -f server
```

---

## 4. 本地开发部署

### 方法 A：完整 Docker 部署（与生产一致）

```bash
# 使用本地覆盖配置（自动启用微信 Mock 模式）
docker compose up -d --build
```

`docker-compose.override.yml` 已配置 `WECHAT_MOCK_MODE=true`，无需真实微信账号。

访问地址：
- 管理后台：`http://localhost`
- API：`http://localhost/api`
- MinIO 控制台：`http://localhost:9001`

### 方法 B：本地开发模式（热更新）

需本地安装 Node.js 18+、PostgreSQL、Redis、MinIO。

```bash
# 后端
cd Cigar_server
cp .env.example .env.local   # 配置本地 DB/Redis 连接
pnpm install
pnpm run start:dev

# 前端
cd Cigar_admin
pnpm install
pnpm run dev
```

---

## 5. 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                     外部访问 :80 / :443                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ cigar_admin │  Nginx (port 80)
                    │  静态文件   │  • 托管 React 构建产物
                    │  + 反代     │  • /api/* → server:3000
                    └──────┬──────┘
                           │ 内部网络 cigar_net
              ┌────────────▼──────────────┐
              │       cigar_server        │  NestJS (port 3000)
              │    • REST API             │
              │    • JWT 鉴权             │
              │    • 定时任务             │
              └────────────┬──────────────┘
          ┌─────────┬──────┴──────┬───────────┐
    ┌─────▼────┐ ┌──▼──┐ ┌───────▼───┐ ┌─────▼─────┐
    │ cigar_pg │ │Redis│ │cigar_minio│ │(外部服务) │
    │ Postgres │ │ 缓存 │ │  对象存储  │ │微信/腾讯云│
    └──────────┘ └─────┘ └───────────┘ └───────────┘
```

### 容器资源限制

| 容器 | 内存限制 | 说明 |
|------|----------|------|
| cigar_pg | 400m | PostgreSQL |
| cigar_redis | 100m | Redis，maxmemory 80mb |
| cigar_minio | 256m | 对象存储 |
| cigar_server | 512m | NestJS，NODE_OPTIONS max-old-space-size=400 |
| cigar_admin | 64m | Nginx 静态服务 |

---

## 6. 启动流程说明

`entrypoint.sh` 在每次容器启动时执行以下步骤：

```
[1/3] 数据库迁移  →  node_modules/.bin/prisma migrate deploy
                     应用 prisma/migrations/ 下所有待执行迁移
                     迁移是幂等的，已执行的不会重复执行

[2/3] 初始化数据  →  node prisma/run-init.js
                     执行 prisma/init.sql
                     ON CONFLICT DO NOTHING，完全幂等
                     自动创建：角色、权限、管理员账号、
                               风味标签、充值档位、等级配置等

[3/3] 启动服务    →  exec node dist/main
```

### init.sql 包含的初始数据

- 4 个角色（超级/商品/订单/会员管理员）
- 27 个权限 + 角色权限关联
- 超级管理员账号 `admin/admin123`
- 12 个风味标签
- 5 个充值档位
- 18 个等级配置（充值/消费各 9 级）
- 12 个系统配置项
- 1 个海报模板默认配置

---

## 7. 常见故障排查

### Q1：`docker compose up` 报端口占用

```bash
# 查找占用 80 端口的进程
sudo lsof -i :80
# 或修改 .env 中 ADMIN_PORT=8080
```

### Q2：server 容器健康检查一直失败

```bash
# 查看详细日志
docker logs cigar_server --tail 50

# 常见原因及解决：
# "Cannot connect to database" → postgres 未就绪，稍等几秒重试
# "migrate deploy failed"     → 检查 DATABASE_URL 配置是否正确
# "Cannot find module 'xxx'"  → 重新构建：docker compose build server
```

### Q3：管理员登录提示"用户名或密码错误"

init.sql 未能插入初始账号，手动执行：

```bash
docker exec -i cigar_pg psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} \
  -c "INSERT INTO admins (username, name, password_hash, role_code, status, must_change_password, failed_attempts, password_changed_at, updated_at)
      VALUES ('admin','超级管理员','\$2b\$12\$RtmWysck/Yed/58nCTfrDe1tSv1jhffZ/G4tfRGyShDhYQ/QlUnnu','super',1,false,0,NOW(),NOW())
      ON CONFLICT (username) DO NOTHING;"
```

### Q4：MinIO 图片无法访问

检查 `MINIO_BUCKET` 环境变量，并确认 MinIO 已创建该 bucket（服务器首次启动时自动创建）。

### Q5：微信登录失败

- 检查 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 是否为**正式版**小程序的密钥
- 本地开发时在 `docker-compose.override.yml` 中设置 `WECHAT_MOCK_MODE=true`

### Q6：清空数据库重新部署

```bash
# 警告：此操作删除所有数据！
docker compose down -v   # -v 删除数据卷
docker compose up -d --build
```

### Q7：查看当前迁移状态

```bash
docker exec cigar_server node_modules/.bin/prisma migrate status
```

---

## 8. 历史修复记录

> 记录部署过程中发现的问题及修复方案，供维护参考。

### Fix-1：`prisma` CLI 误放 devDependencies（2026-05-29）

**问题**：`prisma` CLI 在 `devDependencies` 中，`pnpm prune --prod` 后生产镜像无法执行 `prisma migrate deploy`。

**修复**：`Cigar_server/package.json` — 将 `"prisma": "^7.8.0"` 移至 `dependencies`。

---

### Fix-2：`prisma.config.ts` 未复制到生产镜像（2026-05-29）

**问题**：Prisma v7 需要 `prisma.config.ts` 提供数据库连接 URL，但 `Dockerfile` 的生产阶段未复制该文件，导致迁移时报 `datasource.url property is required`。

**修复**：`Cigar_server/Dockerfile` — 生产阶段添加：
```dockerfile
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
```

---

### Fix-3：`prisma.config.ts` 中 `import "dotenv/config"` 在容器中失败（2026-05-29）

**问题**：Prisma CLI 用 `jiti` 动态加载 `prisma.config.ts` 时，沙箱环境找不到 `node_modules/dotenv`，报 `Cannot find module 'dotenv/config'`。

**根本原因**：Docker Compose 已通过 `environment:` 直接注入 `DATABASE_URL`，根本不需要 dotenv。

**修复**：`Cigar_server/prisma.config.ts` — 删除 `import "dotenv/config"` 一行。

---

### Fix-4：pnpm 虚拟存储符号链接跨 Docker 阶段后断裂（2026-05-29）

**问题**：pnpm 默认使用虚拟存储（`.pnpm/` 软链结构），`COPY --from=builder` 复制到生产阶段后，`node_modules/express`、`node_modules/prisma` 等模块找不到，报 `Cannot find module 'express'`。

**修复**：`Cigar_server/.npmrc` — 添加 `shamefully-hoist=true`，改为扁平 node_modules 结构，兼容 Docker 多阶段复制。

---

### Fix-5：数据库 Schema 与迁移文件不同步（2026-05-29）

**问题**：`admins.failed_attempts` 列在 Prisma schema 中存在，但初始迁移文件未包含，导致登录时报 `column admins.failed_attempts does not exist`。

**修复**：
1. 新增迁移 `prisma/migrations/20260529000001_add_failed_attempts/migration.sql`
2. 使用 `ADD COLUMN IF NOT EXISTS` 保证幂等性，兼容已通过 `prisma db push` 修复的环境

---

### Fix-6：entrypoint 无初始化数据机制（2026-05-29）

**问题**：生产容器没有自动种子机制，首次部署后需手动插入角色、权限、管理员账号等基础数据。

**修复**：
1. 新增 `prisma/init.sql` — 完全幂等的基础数据 SQL
2. 新增 `prisma/run-init.js` — 用内置 `pg` 模块执行 init.sql（避免依赖 `psql` CLI）
3. 更新 `entrypoint.sh` — 在迁移后、启动前自动执行 init 脚本
