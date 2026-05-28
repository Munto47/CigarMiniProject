# CigarPro — GOAT CIGAR CLUB 山羊雪茄俱乐部

一个面向高端雪茄俱乐部的全栈数字化系统，包含微信小程序（用户端）、React 管理后台和 NestJS 后端服务三个子项目。

---

## 项目结构

```
CigarPro/
├── Cigar/            # 微信小程序（用户端）
├── Cigar_admin/      # React 管理后台
├── Cigar_server/     # NestJS 后端 API 服务
├── docs/             # 开发文档与手册
└── Plan.md           # 总体设计方案 v2.0
```

---

## 技术栈

| 子项目 | 技术 |
|--------|------|
| 微信小程序 | JavaScript · Skyline 渲染引擎 · glass-easel |
| 管理后台 | React 19 · Ant Design 6 · Vite 8 · Zustand 5 · Recharts |
| 后端服务 | NestJS 11 · TypeScript 5.7 · Prisma 5 · PostgreSQL 15 · Redis 7 · BullMQ · MinIO |

---

## 功能模块

### 微信小程序（10个页面）

| 页面 | 功能 |
|------|------|
| 首页 AI 推荐 | 5题问答 → 智能推荐雪茄 + 配饮 |
| 风味生成器 | 语音输入 → Canvas 海报 + 分享 |
| 雪茄详情 | 图片、风味、评价展示 + 加购 |
| 购物车 | 商品列表 + 数量调整 + 角标同步 |
| 订单结算 | 购物车摘要 + 支付方式选择 |
| 我的订单 | 全部 / 待支付 / 已支付 / 已完成 |
| 会员中心 | 双等级资产 + 充值入口 + 个人信息 |
| 储值明细 | 充值 / 消费 / 退款流水 |
| 品鉴历史 | 历史记录 + 海报历史（4个 Tab） |
| 海报生成 | 风味编辑 + Canvas 绘制 + 保存分享 |

### 管理后台（15个页面）

Dashboard · 雪茄/饮品商品管理 · 在售库/参考库/风味标签 · 订单管理 · 会员管理 · 储值配置 · 评价审核 · 海报管理 · 账号管理 · 数据统计 · 系统设置

### 后端服务（30个模块）

微信登录鉴权 · JWT 双 Token · RBAC 权限 · 商品 CRUD · 会员双等级 · 微信支付 · 美团对接 · AI 推荐引擎 · 评价 + 敏感词过滤 · 每日对账 · Excel 导入导出 · Prometheus 监控 · k6 压测

---

## 当前实现情况

### 开发进度

| Sprint | 内容 | 状态 |
|--------|------|------|
| Sprint 0 | 基础设施 + 架构设计 | ✅ 完成 |
| Sprint 1 | 认证 + 商品基础 | ✅ 完成 |
| Sprint 2 | 会员 + 充值体系 | ✅ 完成 |
| Sprint 3 | 购物车 + 订单 | ✅ 完成 |
| Sprint 4 | UGC + AI 推荐 + 海报 | ✅ 完成 |
| Sprint 5 | 管理端运营 + 统计 + 对账 | ✅ 完成 |
| Sprint 6 | 联调 / 压测 / 上线准备 | 🔄 进行中 |

**代码层面已 100% 完成**：161 个后端 TS 文件，114 个测试用例全部通过，前后端 API 全量集成（小程序 10/10，管理后台 15/15）。

### 待外部依赖解决后上线

- ⬜ 微信支付商户号 + v3 证书（充值功能生产联调）
- ⬜ 美团商户备案（美团收银对接）
- ⬜ 生产服务器资源（微信云托管 / K8s 部署）
- ⬜ 腾讯云 COS 权限配置（文件上传）

---

## 本地启动

### 前置条件

- Node.js 20 LTS
- pnpm 9+
- Docker + Docker Compose

### 1. 启动后端基础设施（数据库 + 缓存 + 对象存储）

```bash
cd Cigar_server
docker compose -f docker-compose.dev.yml up -d
```

启动后包含：PostgreSQL 15（端口 5432）· Redis 7（端口 6379）· MinIO（端口 9000/9001）

### 2. 后端服务

```bash
cd Cigar_server

# 安装依赖
pnpm install

# 配置环境变量（复制示例并填写）
cp .env.example .env

# 数据库迁移 + 初始化数据
pnpm prisma migrate dev
pnpm prisma db seed

# 启动开发服务器
pnpm start:dev
```

服务启动后：
- API 地址：`http://localhost:3000`
- Swagger 文档：`http://localhost:3000/swagger`
- Prometheus 指标：`http://localhost:3000/api/metrics`

### 3. 管理后台

```bash
cd Cigar_admin

# 安装依赖
pnpm install

# 启动开发服务器（自动代理 /api → localhost:3000）
pnpm dev
```

访问地址：`http://localhost:5173`

演示账号：`admin` / `admin123`

### 4. 微信小程序

使用 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 打开 `Cigar/` 目录。

AppID：`wx8ce906f76c5c88ce`

> 小程序 API 默认请求后端地址，开发阶段可在开发者工具中开启「不校验合法域名」。

### 运行测试

```bash
cd Cigar_server
pnpm test          # 运行全部测试（114个用例）
pnpm test:cov      # 含覆盖率报告
```

---

## 关键设计特性

- **三重幂等防护**：Redis SETNX + 数据库唯一约束 + 业务逻辑检查
- **事务完整性**：所有金额 / 积分 / 等级变更原子化 + 操作日志同事务写入
- **双等级会员体系**：充值等级与消费等级独立计算
- **JWT 双 Token + Redis 黑名单**：accessToken 30min，refreshToken 7天，支持主动吊销
- **RBAC 权限体系**：27 个细粒度权限码
- **支付安全**：微信 v3 RSA 验签 + 美团 HMAC 验签 + 原始报文入库 + nonce 防重放
- **可观测性**：Prometheus 12个业务指标 + Grafana 21个面板 + k6 压测脚本（6场景×4负载）

---

## 文档结构

| 文档 | 说明 |
|------|------|
| `docs/backend/00_新人开发上手.md` | 环境搭建与开发流程 |
| `docs/backend/01_项目结构与编码规范.md` | NestJS 模板与规范 |
| `docs/backend/02_数据库完整DDL.sql` | 建表脚本 + Seed 数据 |
| `docs/backend/03_关键场景实现指南.md` | 幂等、事务、库存、回调代码模板 |
| `docs/backend/04_支付与对账详细设计.md` | 微信 v3 + 美团对接设计 |
| `docs/backend/05_测试用例清单.md` | 测试策略与用例说明 |
| `docs/backend/06_部署与运维Runbook.md` | 三环境部署 + 故障应急手册 |
| `docs/backend/07_阿里云部署完整指南.md` | 阿里云环境完整部署流程 |

---

## 业务需求概览
本项目包含以下核心模块：
- **AI 智能雪茄推荐模块**：问答形式引导，多维权重匹配推荐，并推送配饮。
- **风味生成器模块**：支持语音描述风味，自动生成专属风味海报。
- **会员储值与双等级模块**：充值等级与消费等级独立，支持 V1-V9 体系。
- **下单与收银对接模块**：支持微信储值支付或美团收银支付。
- **AI 雪茄风味解析模块**：结构化展示风味，提供本店与行业相似推荐。
- **评价与评分模块**：支持订单完成后星级评分与文字评论。

## 前后端交互规范
- **请求头**：`Authorization: Bearer <jwt_token>`，携带 `Idempotency-Key` 处理幂等。
- **分页格式**：请求 `?page=1&pageSize=20`，响应 `{ list: [], total: number }`。
- **错误码**：`0` 成功，`1001` Token 过期，`2001` 参数校验失败等。

---
