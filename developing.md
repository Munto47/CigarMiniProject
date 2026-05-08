# CigarPro 开发进度

> **项目**：GOAT CIGAR CLUB 山羊雪茄俱乐部  
> **当前阶段**：Sprint 6 第四轮迭代完成 — 小程序 API 集成全部完成（10/10 页面）+ 管理后台收尾（4 项占位符修复）  
> **最后更新**：2026-05-02（Sprint 6 第五轮迭代 — 可观测性基础设施：Prometheus 指标 + k6 压测 + Grafana 面板）  
> **技术栈**：Node.js 20 + NestJS 10 + TypeScript 5 + Prisma 5 + PostgreSQL 15 + Redis 7 + BullMQ

---

## 整体进度

| Sprint | 阶段 | 周期 | 状态 |
|--------|------|------|------|
| **Sprint 0** | 基础设施 + v2 修订实施 | 2026-04-30 ~ 2026-05-06（1 周） | ✅ 已完成 |
| Sprint 1 | 认证 + 商品基础 | 2026-04-30 ~ 2026-04-30（提前完成） | ✅ 已完成 |
| Sprint 2 | 会员 + 充值 | 2026-04-30（提前完成） | ✅ 已完成 |
| Sprint 3 | 购物车 + 订单（核心交易） | 2026-04-30（提前完成） | ✅ 已完成 |
| Sprint 4 | UGC + AI 推荐 + 海报 | 2026-04-30（提前完成） | ✅ 已完成 |
| Sprint 5 | 管理端运营 + 统计 + 美团生产对接 | 2026-05-01（提前完成） | ✅ 已完成 |
| Sprint 6 | 联调 / 压测 / 上线 | 2026-07-16 ~ 2026-07-29（2 周） | 🔄 进行中 |

---

## Sprint 0：基础设施 + v2 修订实施

**周期**：2026-04-30 ~ 2026-05-06  
**目标**：后端项目骨架可启动，DDL 落库，幂等测试全绿

### 任务清单

| # | 任务 | 描述 | 状态 |
|---|------|------|------|
| S0-1 | 仓库初始化 | 创建 `Cigar_server/` NestJS monorepo + Prisma 骨架，`pnpm start:dev` 可启动 | ✅ 已完成 |
| S0-2 | Docker Compose | `docker-compose.dev.yml`：PG 15 + Redis 7 + MinIO（本地替代腾讯云 COS）| ✅ 已完成 |
| S0-3 | 数据库迁移 | 执行 `docs/backend/02_数据库完整DDL.sql`，v2 修订 7 项 P0 全部落库（`stock_locked` / `refunded_amount_cents` / `level_configs EXCLUDE` 等）| ✅ 已完成 |
| S0-4 | SEED 数据 | `prisma/seed.ts`：permissions(25 条) / categories / 超管账号(admin/admin123) / 推荐题(5 题) / 风味标签(12 个) | ✅ 已完成 |
| S0-5 | 全局基础设施 | `src/common/`：统一响应体 / 全局异常过滤器 / 日志拦截器 / 统一分页结构（参见 Plan.md §0.3 七条铁律）| ✅ 已完成 |
| S0-6 | JWT + Guard | `src/auth/`：accessToken（管理端 2h / 用户端 30min）+ refreshToken（7d）+ Redis 黑名单 | ✅ 已完成 |
| S0-7 | Swagger 文档 | NestJS Swagger 模块接入，`GET /swagger.json` 返回 OpenAPI 3.0 | ✅ 已完成 |
| S0-8 | CI 流水线 | GitHub Actions：lint + test + build，合并前必须全绿 | ✅ 已完成 |
| S0-9 | 幂等 mock 测试 | `tests/idempotency/*.spec.ts`：覆盖 9 个幂等场景（充值/下单/支付/退款/调整余额/等级重算等）| ✅ 已完成 |

### 验收标准

- [x] `GET /health` 返回 200
- [x] `GET /swagger.json` 或 Swagger UI 可访问
- [x] `prisma migrate dev` 执行无报错
- [x] v2 修订 7 项全部在 staging 数据库生效
- [x] `psql -c "SELECT COUNT(*) FROM permissions"` = 25
- [x] 幂等 mock 测试 9 个场景全绿（`pnpm test tests/idempotency`）

---

## Sprint 1：认证 + 商品基础（已完成 ✅）

**周期**：2026-04-30（提前完成，利用 Sprint 0 余量）  
**目标**：管理后台登录真实接入，商品/雪茄库 CRUD 联通，小程序登录拿到 token

### 任务清单

| # | 任务 | 负责端 | 状态 |
|---|------|--------|------|
| S1-1 | `POST /api/auth/wechat-login`（微信 code2Session → 查/建 User → JWT） | 后端 | ✅ 已完成 |
| S1-2 | `POST /api/auth/refresh`（refreshToken 验签 → 新 accessToken） | 后端 | ✅ 已完成 |
| S1-3 | `POST /api/auth/decrypt-phone` ★（AES-CBC 解密 → AES-GCM 存库 → phoneMask） | 后端 | ✅ 已完成 |
| S1-4 | `POST /api/admin/login` + Redis 失败 5 次锁定 1h | 后端 | ✅ 已完成 |
| S1-5 | `POST /api/admin/refresh-token` | 后端 | ✅ 已完成 |
| S1-6 | 商品 CRUD：`admin/products/cigars` + 公开 `/cigars` | 后端 | ✅ 已完成 |
| S1-7 | 商品 CRUD：`admin/products/drinks` + 公开 `/drinks` | 后端 | ✅ 已完成 |
| S1-8 | 雪茄库 CRUD + 同步：`/api/admin/library/instore` | 后端 | ✅ 已完成 |
| S1-9 | 风味标签 CRUD：`/api/admin/library/tags` | 后端 | ✅ 已完成 |
| S1-10 | 文件上传：`POST /api/upload/image`（Multer → MinIO） | 后端 | ✅ 已完成 |
| S1-11 | RBAC Guard + 27 个权限码（Sprint 0 已完成） | 后端 | ✅ 已完成 |
| S1-12 | 首登强改密码 + 90 天到期策略（`POST /api/admin/change-password`） | 后端 | ✅ 已完成 |
| S1-13 | 操作日志模块（OperationLogService 全局模块） | 后端 | ✅ 已完成 |
| S1-14 | 限流 ThrottlerModule（60/min 全局，5/min 登录） | 后端 | ✅ 已完成 |
| S1-15 | 加密工具（AES-256-GCM 手机号、AES-128-CBC 微信解密） | 后端 | ✅ 已完成 |
| S1-F1 | 管理后台登录页接入真实接口 | 前端联调 | ⬜ 待联调 |
| S1-F2 | 管理后台 `/products` + `/library` 页面接入 | 前端联调 | ⬜ 待联调 |
| S1-F3 | 小程序 `wx.login` 接入 `/api/auth/wechat-login` | 前端联调 | ⬜ 待联调 |

### 新增文件清单（38 个文件）

**认证模块**（11 个文件）：
- `src/auth/auth.service.ts`、`src/auth/auth.controller.ts`
- `src/auth/admin-auth.service.ts`、`src/auth/admin-auth.controller.ts`
- `src/auth/dto/*.dto.ts`（5 个 DTO）

**商品模块**（10 个文件）：
- `src/product/product.module.ts`、`src/product/product.service.ts`
- `src/product/admin-cigar.controller.ts`、`src/product/admin-drink.controller.ts`
- `src/product/public-cigar.controller.ts`、`src/product/public-drink.controller.ts`
- `src/product/dto/*.dto.ts`（6 个 DTO）

**雪茄库模块**（8 个文件）：
- `src/library/library.module.ts`
- `src/library/instore.service.ts`、`src/library/instore.controller.ts`
- `src/library/tags.service.ts`、`src/library/tags.controller.ts`
- `src/library/dto/*.dto.ts`（6 个 DTO）

**基础设施**（7 个文件）：
- `src/operation-log/` — 操作日志全局模块
- `src/infra/minio/` — MinIO 对象存储封装
- `src/upload/` — 文件上传模块
- `src/common/utils/crypto.ts` — 加密工具

**修改文件**（3 个）：
- `src/auth/auth.module.ts` — 注册新 controllers/services
- `src/app.module.ts` — 导入所有新模块 + ThrottlerModule
- `.env` — 新增 `ENCRYPTION_KEY` + `WECHAT_MOCK_MODE`

### 验收标准

- [x] `pnpm build` 编译零错误
- [x] `pnpm test` 24 个测试全部通过（含新增 crypto 单测）
- [x] 管理后台登录：admin/admin123 → 强改密码 → 失败 5 次锁定
- [x] 商品/雪茄库/风味标签 CRUD 全部有对应接口 + RBAC + 操作日志
- [x] 小程序微信登录 mock 模式可正常获取 token
- [x] 公开接口无需鉴权可访问
- [x] Swagger UI 可见所有新增 API
- [ ] 前端联调待后续进行

---

## Sprint 2：会员 + 充值（已完成 ✅）

**周期**：2026-04-30（提前完成）  
**目标**：实现会员主页、储值流水查询、充值档位管理、等级配置管理、微信支付充值、余额调整、等级重算

### 任务清单

| # | 任务 | 负责端 | 状态 |
|---|------|--------|------|
| S2-1 | `GET /api/member/profile`（会员资产、双等级、积分、余额） | 后端 | ✅ 已完成 |
| S2-2 | `GET /api/member/transactions`（储值余额流水明细分页查询） | 后端 | ✅ 已完成 |
| S2-3 | `GET /api/storedvalue/tiers`（公开）+ 管理端 CRUD | 后端 | ✅ 已完成 |
| S2-4 | `GET /api/storedvalue/level-config/:type`（公开）+ 管理端 CRUD | 后端 | ✅ 已完成 |
| S2-5 | `POST /api/member/recharge`（充值下单 + 微信支付 v3 JSAPI，含 Mock 模式） | 后端 | ✅ 已完成 |
| S2-6 | `POST /api/payment/wechat-callback`（微信支付回调：验签、幂等、入账、积分、等级升级） | 后端 | ✅ 已完成 |
| S2-7 | `POST /api/admin/storedvalue/transactions/adjust`（管理员手动调整余额，**幂等必须**） | 后端 | ✅ 已完成 |
| S2-8 | `POST /api/admin/storedvalue/level-config/recalculate`（等级重算异步任务） | 后端 | ✅ 已完成 |
| S2-9 | `GET /api/admin/storedvalue/transactions` + `GET /api/admin/storedvalue/recharge-orders`（管理端查询） | 后端 | ✅ 已完成 |
| S2-10 | Sprint 2 单元测试（15 个测试用例，覆盖等级算法、幂等、余额不变量） | 测试 | ✅ 已完成 |

### 新增文件清单（16 个文件）

**会员模块**（4 个文件）：
- `src/member/member.module.ts`、`src/member/member.service.ts`、`src/member/member.controller.ts`
- `src/member/dto/query-transactions.dto.ts`

**储值模块**（12 个文件）：
- `src/storedvalue/storedvalue.module.ts`
- `src/storedvalue/tiers.service.ts`（含 TiersService + LevelConfigService）
- `src/storedvalue/tiers-admin.controller.ts`、`src/storedvalue/storedvalue-public.controller.ts`
- `src/storedvalue/level-config-admin.controller.ts`
- `src/storedvalue/recharge.service.ts`、`src/storedvalue/recharge.controller.ts`
- `src/storedvalue/wechat-pay.service.ts`、`src/storedvalue/wechat-callback.controller.ts`
- `src/storedvalue/adjust.service.ts`、`src/storedvalue/level-recalc.service.ts`
- `src/storedvalue/storedvalue-admin.controller.ts`
- `src/storedvalue/dto/tier.dto.ts`、`src/storedvalue/dto/level-config.dto.ts`、`src/storedvalue/dto/recharge.dto.ts`

**测试文件**（2 个文件）：
- `test/sprint2/member.service.spec.ts`
- `test/sprint2/storedvalue.spec.ts`

**修改文件**（3 个）：
- `src/app.module.ts` — 注册 MemberModule + StoredValueModule
- `src/common/utils/id-generator.ts` — 新增无 Redis 依赖的独立单号生成函数

### 验收标准

- [x] `pnpm build` 编译零错误
- [x] `pnpm test` 39 个测试全部通过（Sprint 0/1 原有 24 + Sprint 2 新增 15）
- [x] 会员主页接口返回完整资产信息（余额、双等级、积分、累计充值/消费）
- [x] 充值下单 Mock 模式可返回支付参数
- [x] 微信回调处理事务完整：余额入账 + 积分入账 + 等级升级 + 流水记录
- [x] 余额调整幂等防御：Redis SETNX + DB 唯一约束双重保障
- [x] 等级重算异步任务可处理全量用户
- [x] 余额不变量测试通过：SUM(流水) ≡ balance_cents
- [ ] 前端联调待后续进行
- [ ] 微信支付生产环境待商户号 + 证书申请

### Sprint 2 关键设计决策

1. **WechatPayService 支持 Mock 模式**：`WECHAT_MOCK_MODE=true` 时返回模拟 prepay_id，方便开发调试
2. **充值回调幂等**：`recharge_orders.recharge_no` 唯一 + 事务内 status 检查 + `balance_transactions` 唯一约束三重保障
3. **余额调整幂等**：Redis `idem:adjust:{adminId}:{key}` SETNX（600s TTL）+ `balance_transactions(related_type='manual', related_no)` 唯一约束双重兜底
4. **等级重算**：一期不依赖 BullMQ，使用 `setTimeout` 异步执行 + 内存 `progressMap` 跟踪进度，批量 200 条
5. **单号生成**：独立函数 `generateRechargeNo()` 基于时间戳后缀，无 Redis 依赖

### 待前端联调接口

| 接口 | 用途 | 优先级 |
|------|------|--------|
| `GET /api/member/profile` | 小程序会员中心数据展示 | P0 |
| `POST /api/member/recharge` | 小程序充值按钮拉起微信支付 | P0 |
| `GET /api/member/transactions` | 小程序「明细」页 | P0 |
| `GET /api/storedvalue/tiers` | 小程序充值页面档位列表 | P1 |
| `GET /api/storedvalue/level-config/:type` | 小程序等级说明页 | P2 |
| 管理端 CRUD | `/admin/storedvalue/*` 全部 10 个接口 | P0 |

---

## Sprint 3：购物车 + 订单（已完成 ✅）

**周期**：2026-04-30（提前完成）  
**目标**：实现购物车 CRUD、订单创建（库存预占）、余额支付（行级锁+幂等）、超时关闭、退款（余额回退+渠道决策）、美团 Stub

### 任务清单

| # | 任务 | 负责端 | 状态 |
|---|------|--------|------|
| S3-1 | Cart CRUD + 角标 + 校验（`src/cart/`） | 后端 | ✅ 已完成 |
| S3-2 | 订单创建（幂等、库存预占 FOR UPDATE、价格快照、`actual_amount_cents`） | 后端 | ✅ 已完成 |
| S3-3 | 余额支付（行级锁 FOR UPDATE NOWAIT、幂等命中分支、事务内扣款+流水+积分+等级+实扣库存） | 后端 | ✅ 已完成 |
| S3-4 | 订单取消（仅 pending→cancelled、库存释放） | 后端 | ✅ 已完成 |
| S3-5 | 超时关闭 cron（SKIP LOCKED + 30s 安全边界、库存回退、支付关闭） | 后端 | ✅ 已完成 |
| S3-6 | 用户订单列表 `GET /api/orders` + 详情 `GET /api/orders/{id}` | 后端 | ✅ 已完成 |
| S3-7 | 管理端订单列表 `GET /api/admin/orders` + 详情 `GET /api/admin/orders/{id}` | 后端 | ✅ 已完成 |
| S3-8 | 管理端修改状态 `PATCH /api/admin/orders/{id}/status` | 后端 | ✅ 已完成 |
| S3-9 | 退款 `POST /api/admin/orders/{id}/refund`（幂等、进行中保护、渠道决策、余额回退+积分+等级） | 后端 | ✅ 已完成 |
| S3-10 | 美团 Stub（`meituan.service.ts`，推单+查询占位） | 后端 | ✅ 已完成 |
| S3-11 | 订单状态机 `order-state-machine.ts`（合法/非法流转校验） | 后端 | ✅ 已完成 |
| S3-12 | Sprint 3 测试（29 个用例：状态机、余额、退款、库存预占） | 测试 | ✅ 已完成 |

### 新增文件清单（19 个文件）

**购物车模块**（5 个文件）：
- `src/cart/cart.module.ts`、`src/cart/cart.service.ts`、`src/cart/cart.controller.ts`
- `src/cart/dto/add-cart.dto.ts`、`src/cart/dto/update-cart.dto.ts`

**订单模块**（13 个文件）：
- `src/order/order.module.ts`、`src/order/order.service.ts`、`src/order/order.controller.ts`
- `src/order/admin-order.controller.ts`、`src/order/payment.service.ts`、`src/order/refund.service.ts`
- `src/order/order-cron.service.ts`、`src/order/meituan.service.ts`、`src/order/order-state-machine.ts`
- `src/order/dto/create-order.dto.ts`、`src/order/dto/query-order.dto.ts`
- `src/order/dto/pay-order.dto.ts`、`src/order/dto/refund.dto.ts`、`src/order/dto/status.dto.ts`

**测试文件**（1 个文件）：
- `test/sprint3/order.spec.ts`

**修改文件**（1 个）：
- `src/app.module.ts` — 注册 CartModule + OrderModule

### 验收标准

- [x] `pnpm build` 编译零错误
- [x] `pnpm test` 68 个测试全部通过（+29 Sprint 3 新增）
- [x] 购物车 CRUD + 角标 + 校验接口完整
- [x] 订单创建：幂等键防重 + 库存预占 + 价格快照
- [x] 余额支付：行级锁事务 + 幂等命中分支 + 扣款/流水/积分/等级/实扣库存
- [x] 订单取消：库存释放 + 支付单关闭
- [x] 超时关闭 cron：SKIP LOCKED + 30s 边界
- [x] 退款：余额回退+积分扣回+等级降级、进行中保护(4005)、渠道决策
- [x] 状态机全部合法/非法流转校验
- [ ] 前端联调待后续进行
- [ ] 微信/美团生产环境待商户账号申请

### Sprint 3 关键设计决策

1. **订单创建用 `FOR UPDATE` 锁库存行**：防止高并发卖超，CHECK 约束 `stock_locked <= stock` 兜底
2. **余额支付用 `FOR UPDATE NOWAIT`**：与 timeout cron 的 `SKIP LOCKED` 互不阻塞
3. **幂等第二道防线**：`orders(user_id, idempotency_key)` 唯一约束，兜底 Redis 过期
4. **退款中保护**：`SELECT ... WHERE status='pending'` 检查防止重复发起退款
5. **退款渠道决策（方案 A）**：余额订单退余额（同步）、微信/美团订单走原通道（异步）
6. **超时关闭安全边界**：`expire_at < now() - 30s` 避免与正在支付的订单竞态
7. **美团一期 Stub**：`MeituanService` 返回模拟数据，等待生产商户备案后替换

### 待前端联调接口

| 接口 | 用途 | 优先级 |
|------|------|--------|
| `GET /api/cart` | 购物车列表 | P0 |
| `POST /api/cart/add` | 添加到购物车 | P0 |
| `PUT /api/cart/:id` | 修改数量 | P1 |
| `DELETE /api/cart/:id` | 删除项 | P1 |
| `GET /api/cart/count` | 购物车角标 | P0 |
| `GET /api/cart/validate` | 购物车校验 | P1 |
| `POST /api/orders` | 创建订单（需 `Idempotency-Key` 头） | P0 |
| `GET /api/orders` | 用户订单列表 | P0 |
| `GET /api/orders/:id` | 订单详情 | P0 |
| `POST /api/orders/:id/pay` | 执行支付 | P0 |
| `POST /api/orders/:id/cancel` | 取消订单 | P0 |
| `GET /api/admin/orders` | 管理端订单列表 | P0 |
| `GET /api/admin/orders/:id` | 管理端订单详情 | P0 |
| `PATCH /api/admin/orders/:id/status` | 修改订单状态 | P0 |
| `POST /api/admin/orders/:id/refund` | 发起退款（需 `Idempotency-Key` 头） | P0 |
| `POST /api/admin/orders/sync-meituan` | 手动同步美团 | P1 |

---

## Sprint 4：UGC + AI 推荐 + 海报（已完成 ✅）

**周期**：2026-04-30（提前完成）  
**目标**：实现评价（含敏感词过滤 + 评分同步）、AI 推荐规则引擎（基于 `cigar_tags + flavor_tags.score_map`）、语音风味解析（Mock 模式）、历史记录、海报记录入库

### 任务清单

| # | 任务 | 负责端 | 状态 |
|---|------|--------|------|
| S4-1 | 评价模块：`POST /api/reviews`（敏感词过滤 + pending/visible 策略 + 评分同步） | 后端 | ✅ 已完成 |
| S4-2 | 评价模块：`GET /api/cigars/{id}/reviews`（公开分页，仅 visible） | 后端 | ✅ 已完成 |
| S4-3 | 评价管理：管理端审核（visible/hidden）、删除、敏感词 CRUD | 后端 | ✅ 已完成 |
| S4-4 | AI 推荐：`POST /api/recommend`（规则引擎：用户答案 → 风味向量 → cigar_tag score_map 打分） | 后端 | ✅ 已完成 |
| S4-5 | AI 推荐：`GET /api/recommend/questions`（公开） | 后端 | ✅ 已完成 |
| S4-6 | 历史记录：`GET /api/history`（分页查询品鉴记录） | 后端 | ✅ 已完成 |
| S4-7 | 历史记录（写）：`POST /api/history/tasting` | 后端 | ✅ 已完成 |
| S4-8 | 海报：`POST /api/posters`（记录入库 + 自动创建品鉴记录） | 后端 | ✅ 已完成 |
| S4-9 | 海报：`GET /api/posters/{id}`（海报详情） | 后端 | ✅ 已完成 |
| S4-10 | 海报管理：管理端列表 + 模板 CRUD（单例 upsert） | 后端 | ✅ 已完成 |
| S4-11 | 风味语音：`POST /api/flavor/analyze-voice`（Mock 模式，二期接入腾讯云 ASR） | 后端 | ✅ 已完成 |
| S4-12 | 风味标签：`GET /api/flavor/tags`（公开） | 后端 | ✅ 已完成 |
| S4-13 | Sprint 4 测试（17 个测试用例，覆盖 5 个模块） | 测试 | ✅ 已完成 |

### 新增文件清单（20 个文件）

**评价模块**（6 个文件）：
- `src/review/review.module.ts`、`src/review/review.service.ts`
- `src/review/review.controller.ts`、`src/review/admin-review.controller.ts`
- `src/review/dto/create-review.dto.ts`、`src/review/dto/query-review.dto.ts`、`src/review/dto/moderate-review.dto.ts`

**AI 推荐模块**（4 个文件）：
- `src/recommend/recommend.module.ts`、`src/recommend/recommend.service.ts`、`src/recommend/recommend.controller.ts`
- `src/recommend/dto/recommend.dto.ts`

**历史记录模块**（4 个文件）：
- `src/history/history.module.ts`、`src/history/history.service.ts`、`src/history/history.controller.ts`
- `src/history/dto/tasting.dto.ts`

**海报模块**（6 个文件）：
- `src/poster/poster.module.ts`、`src/poster/poster.service.ts`
- `src/poster/poster.controller.ts`、`src/poster/admin-poster.controller.ts`
- `src/poster/dto/create-poster.dto.ts`、`src/poster/dto/update-template.dto.ts`

**风味模块**（4 个文件）：
- `src/flavor/flavor.module.ts`、`src/flavor/flavor.service.ts`、`src/flavor/flavor.controller.ts`
- `src/flavor/dto/analyze-voice.dto.ts`

**测试文件**（4 个文件）：
- `test/sprint4/review.spec.ts`
- `test/sprint4/recommend.spec.ts`
- `test/sprint4/poster.spec.ts`
- `test/sprint4/history-flavor.spec.ts`

**修改文件**（1 个）：
- `src/app.module.ts` — 注册 ReviewModule + RecommendModule + HistoryModule + PosterModule + FlavorModule

### 验收标准

- [x] `pnpm build` 编译零错误
- [x] `pnpm test` 85 个测试全部通过（+17 Sprint 4 新增）
- [x] 评价提交：敏感词自动检测 → pending/visible + 唯一约束防重复评价
- [x] 评分同步：`reviews` 变更自动重算 `cigars.rating_avg/rating_count`
- [x] AI 推荐规则引擎：基于用户答案 → 风味向量 → tag score_map 打分排序
- [x] 推荐日志落库：`recommend_logs` 记录每次推荐结果
- [x] 品鉴历史：分页查询 + 新增记录
- [x] 海报生成：记录入库 + 自动同步品鉴记录
- [x] 海报模板：单例管理（数据库 PK=1）
- [x] 语音分析：Mock 模式返回模拟风味数据
- [x] 管理端：评价审核/删除 + 敏感词 CRUD + 海报管理 + 模板配置
- [ ] 前端联调待后续进行

### Sprint 4 关键设计决策

1. **敏感词过滤策略**：`ReviewService.filterSensitiveWords()` 遍历启用敏感词做 `includes` 匹配，含词 → `pending`，不含 → `visible`。可扩展配置 `system_configs.review_auto_approve` 控制是否全量审核。
2. **评分同步（应用层）**：评价增/改/删后在 Service 层调用 `syncCigarRating()`，用 `aggregate` 重算。一期未使用数据库触发器（应用层更灵活，可加缓存）。
3. **AI 推荐规则引擎**：不依赖外部 AI，纯规则打分。用户答案 → `flavorWeights` map → 遍历雪茄的 `cigar_tags` → 用 `flavor_tags.score_map` 加权求和。无偏好时降级为评分排序。
4. **推荐问题设计**：`recommend_questions.options` 为 JSONB，每个选项含 `flavorWeights` map 用于打分。问题支持单选/多选（`multi` 字段）。
5. **海报 = 品鉴记录**：`POST /api/posters` 创建海报时自动创建一条 `tasting_records(source='poster')`，避免数据重复。
6. **海报模板单例**：使用 SMALLINT PK CHECK(id=1)，upsert 实现创建/更新合一，符合 Plan.md 约束。
7. **风味语音 Mock**：`VOICE_ASR_MOCK=true` 环境变量控制，Mock 模式下若传 `cigarId` 则返回该雪茄已有风味标签。
8. **评价唯一约束**：`(order_id, cigar_id)` 唯一索引 `uniq_review_per_order_cigar`，Prisma 暴露为 `orderId_cigarId` 复合键。

### 待前端联调接口

| 接口 | 用途 | 优先级 |
|------|------|--------|
| `POST /api/reviews` | 用户提交评价 | P0 |
| `GET /api/cigars/:id/reviews` | 雪茄评价列表 | P0 |
| `GET /api/recommend/questions` | 获取推荐问题 | P0 |
| `POST /api/recommend` | AI 推荐结果 | P0 |
| `GET /api/history` | 品鉴历史记录 | P0 |
| `POST /api/history/tasting` | 记录品鉴 | P1 |
| `POST /api/posters` | 生成海报 | P1 |
| `GET /api/posters/:id` | 海报详情 | P1 |
| `GET /api/flavor/tags` | 风味标签列表 | P1 |
| `POST /api/flavor/analyze-voice` | 语音风味分析 | P1 |
| 管理端 CRUD | `/admin/reviews/*` + `/admin/posters/*` | P0 |

---

## Sprint 5：管理端运营 + 统计 + 系统设置 + 对账 + 导出（已完成 ✅）

**周期**：2026-05-01（提前完成）  
**目标**：实现数据概览 Dashboard、数据统计、系统设置管理、每日对账、Excel 导入导出

### 任务清单

| # | 任务 | 负责端 | 状态 |
|---|------|--------|------|
| S5-1 | Dashboard 4 接口：`GET /api/admin/dashboard/overview`、`sales-trend`、`recent-orders`、`top-products` | 后端 | ✅ 已完成 |
| S5-2 | Statistics 5 接口：`GET /api/admin/statistics/sales`、`categories`、`users`、`storedvalue`、`export` | 后端 | ✅ 已完成 |
| S5-3 | Settings 模块：系统配置分组查询/更新、操作日志分页、美团测试连接 | 后端 | ✅ 已完成 |
| S5-4 | 公开店铺信息接口：`GET /api/admin/settings/public/store-info`（@Public） | 后端 | ✅ 已完成 |
| S5-5 | Reconciliation 对账模块：每日对账、报告列表、手动触发、差异解决 | 后端 | ✅ 已完成 |
| S5-6 | Export Excel 模块：订单/交易/雪茄库导出、雪茄库 Excel 导入 | 后端 | ✅ 已完成 |
| S5-7 | Sprint 5 测试（17 个用例，覆盖 4 个模块） | 测试 | ✅ 已完成 |

### 新增文件清单（16 个文件）

**Dashboard 模块**（3 个文件）：
- `src/dashboard/dashboard.module.ts`、`src/dashboard/dashboard.service.ts`、`src/dashboard/dashboard.controller.ts`

**Statistics 模块**（3 个文件）：
- `src/statistics/statistics.module.ts`、`src/statistics/statistics.service.ts`、`src/statistics/statistics.controller.ts`

**Settings 模块**（3 个文件）：
- `src/settings/settings.module.ts`、`src/settings/settings.service.ts`、`src/settings/settings.controller.ts`

**Reconciliation 模块**（4 个文件）：
- `src/reconciliation/reconciliation.module.ts`、`src/reconciliation/reconciliation.service.ts`
- `src/reconciliation/reconciliation-cron.service.ts`、`src/reconciliation/reconciliation.controller.ts`

**Export 模块**（3 个文件）：
- `src/export/export.module.ts`、`src/export/export.service.ts`、`src/export/export.controller.ts`

**测试文件**（4 个文件）：
- `test/sprint5/dashboard.spec.ts`
- `test/sprint5/statistics.spec.ts`
- `test/sprint5/settings.spec.ts`
- `test/sprint5/reconciliation.spec.ts`

**修改文件**（1 个）：
- `src/app.module.ts` — 注册 DashboardModule + StatisticsModule + SettingsModule + ReconciliationModule + ExportModule

**新增依赖**（1 个）：
- `exceljs` — Excel 读写库

### 验收标准

- [x] `pnpm build` 编译零错误
- [x] `pnpm test` 102 个测试全部通过（85 原有 + 17 Sprint 5 新增）
- [x] Dashboard 概览返回用户/订单/营收/商品/余额核心指标
- [x] 销售趋势按日返回（本地日期，无 UTC 时区偏移）
- [x] 统计模块覆盖按渠道/分类/用户/储值 4 个维度
- [x] 系统设置按 basic/meituan/other 分组返回
- [x] 操作日志支持按 module 筛选分页
- [x] 对账模块 upsert 每日报告，差异自动检测
- [x] Excel 导出：订单(10 列)、交易流水(9 列)、雪茄库(12 列)
- [x] Excel 导入雪茄库：支持 dryRun 预览模式
- [ ] 前端联调待后续进行
- [ ] 美团生产环境待商户备案

### Sprint 5 关键设计决策

1. **Dashboard 日期使用本地日期字符串**：避免 `toISOString()` 的 UTC 时区偏移导致日期错位
2. **Statistics 按渠道拆分**：balance/wechat/meituan 三个渠道独立统计
3. **Settings 公开接口**：`/public/store-info` 供小程序 club 页获取电话/地址，无需鉴权
4. **Reconciliation 使用 upsert**：`(channel, date)` 唯一约束，每日重复运行幂等
5. **Reconciliation Cron 独立 Service**：`ReconciliationCronService` 解耦调度逻辑，可通过外部 cron 或 BullMQ 触发
6. **Excel 导入支持 dryRun**：`POST /api/admin/export/cigars/import?dryRun=true` 预览解析结果，不实际入库
7. **操作日志更新操作记录 before/after**：系统配置变更时记录新旧值

### Sprint 5 接口清单

| 接口 | 用途 | 优先级 |
|------|------|--------|
| `GET /api/admin/dashboard/overview` | 核心指标卡片（用户/订单/营收） | P0 |
| `GET /api/admin/dashboard/sales-trend?days=7` | 销售趋势按日 | P1 |
| `GET /api/admin/dashboard/recent-orders?limit=10` | 最近订单 | P1 |
| `GET /api/admin/dashboard/top-products?limit=10` | 畅销雪茄排行 | P1 |
| `GET /api/admin/statistics/sales` | 销售统计（按渠道+日+充值+退款） | P1 |
| `GET /api/admin/statistics/categories` | 分类销售统计 | P1 |
| `GET /api/admin/statistics/users` | 用户统计（增长/等级/活跃） | P1 |
| `GET /api/admin/statistics/storedvalue` | 储值统计（充值/消费/档位） | P1 |
| `GET /api/admin/statistics/export` | 销售数据导出 JSON | P1 |
| `GET /api/admin/settings` | 系统设置分组查询 | P1 |
| `PUT /api/admin/settings/:key` | 更新系统配置 | P1 |
| `GET /api/admin/settings/logs` | 操作日志分页 | P1 |
| `POST /api/admin/settings/meituan/test` | 美团连接测试 | P2 |
| `GET /api/admin/settings/public/store-info` | 店铺公开信息（无需鉴权） | P0 |
| `GET /api/admin/reconciliation/reports` | 对账报告列表 | P1 |
| `POST /api/admin/reconciliation/run` | 手动触发对账 | P1 |
| `POST /api/admin/reconciliation/reports/:id/resolve` | 标记差异已解决 | P2 |
| `GET /api/admin/export/orders` | 导出订单 Excel | P1 |
| `GET /api/admin/export/transactions` | 导出流水 Excel | P1 |
| `GET /api/admin/export/cigars` | 导出雪茄库 Excel | P1 |
| `POST /api/admin/export/cigars/import` | 导入雪茄库 Excel | P1 |

---

## Sprint 6：联调 / 压测 / 上线（进行中 🔄）

**周期**：2026-05-01 起，持续至全部完成  
**当前阶段**：代码层面全部完成 — 管理后台 15/15 页面 API 集成、安全加固、Mock 页面迁移全部就绪

### Sprint 6 第一轮迭代（2026-05-01）：代码审查与缺陷修复

审查 Plan.md 列出的全部 P0+P1 接口，发现并修复了 3 类问题。

#### 修复 1：路由前缀双写问题（15 个 Controller）

`main.ts` 已通过 `app.setGlobalPrefix('api')` 设置全局前缀，但 15 个 Controller 的 `@Controller()` 装饰器中又重复写了 `api/` 前缀，导致实际路由变成 `api/api/...`。

**受影响路由**：

| 文件 | 修复前 | 修复后 |
|------|--------|--------|
| `src/order/order.controller.ts` | `api/orders` | `orders` |
| `src/order/admin-order.controller.ts` | `api/admin/orders` | `admin/orders` |
| `src/cart/cart.controller.ts` | `api/cart` | `cart` |
| `src/recommend/recommend.controller.ts` | `api/recommend` | `recommend` |
| `src/history/history.controller.ts` | `api/history` | `history` |
| `src/poster/poster.controller.ts` | `api/posters` | `posters` |
| `src/flavor/flavor.controller.ts` | `api/flavor` | `flavor` |
| `src/review/review.controller.ts` | `api` | `(空)` |
| `src/dashboard/dashboard.controller.ts` | `api/admin/dashboard` | `admin/dashboard` |
| `src/statistics/statistics.controller.ts` | `api/admin/statistics` | `admin/statistics` |
| `src/settings/settings.controller.ts` | `api/admin/settings` | `admin/settings` |
| `src/reconciliation/reconciliation.controller.ts` | `api/admin/reconciliation` | `admin/reconciliation` |
| `src/review/admin-review.controller.ts` | `api/admin/reviews` | `admin/reviews` |
| `src/export/export.controller.ts` | `api/admin/export` | `admin/export` |
| `src/poster/admin-poster.controller.ts` | `api/admin/posters` | `admin/posters` |

#### 修复 2：实现管理员账号管理模块（4 个新文件）

Plan.md §1.2 P0 要求 `GET/POST/PUT/DELETE /api/admin/accounts` + `GET /api/admin/login-logs`，之前完全缺失。

**新增文件**：
- `src/admin-accounts/admin-accounts.module.ts`
- `src/admin-accounts/admin-accounts.service.ts`
- `src/admin-accounts/admin-accounts.controller.ts`
- `src/admin-accounts/dto/create-admin.dto.ts`
- `src/admin-accounts/dto/update-admin.dto.ts`
- `src/admin-accounts/dto/query-login-logs.dto.ts`

**接口**：

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `GET` | `/api/admin/accounts` | `account:read` | 管理员列表（分页） |
| `GET` | `/api/admin/accounts/:id` | `account:read` | 管理员详情 |
| `POST` | `/api/admin/accounts` | `account:write` | 创建管理员（自动 bcrypt 哈希密码） |
| `PUT` | `/api/admin/accounts/:id` | `account:write` | 更新管理员（含密码修改） |
| `DELETE` | `/api/admin/accounts/:id` | `account:write` | 软删除管理员 |
| `GET` | `/api/admin/login-logs` | `account:read` | 登录日志（分页，支持按用户名/结果筛选） |

**关键设计**：
- 密码强度校验：≥8 位 + 含大小写字母 + 数字（`@Matches` 正则）
- 创建/更新/删除均记录操作日志（`level='warning'`）
- 用户名唯一性校验（排除已软删除记录）
- 新创建管理员默认 `mustChangePassword=true`

#### 修复 3：实现美团回调接口（1 个新文件）

Plan.md §1.2 P0 要求 `POST /api/payment/meituan-callback`，之前缺失。

**新增文件**：
- `src/order/meituan-callback.controller.ts`

**接口**：

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `POST` | `/api/payment/meituan-callback` | 公开 | 美团支付回调（幂等 + 状态机合规） |

**关键设计**：
- 回调原始报文写入 `payment_callbacks` 表（`channel='meituan'`）
- 唯一约束 `(channel, external_id)` 防重放
- 幂等命中：已处理的回调直接返回 `SUCCESS`
- 订单状态流转：`pending → settling`，`meituan_sync_status='synced'`
- 仅处理 `payMethod='meituan'` 的订单（不过滤 `status='pending'` 以外的订单）

### Sprint 6 测试覆盖

**新增测试文件**：`test/sprint6/admin-accounts.spec.ts`（12 个用例）

| 测试组 | 用例数 | 覆盖内容 |
|--------|--------|----------|
| `listAccounts` | 2 | 分页列表、软删除排除 |
| `createAccount` | 4 | 创建成功、用户名重复、角色不存在、默认改密 |
| `updateAccount` | 3 | 更新信息、密码重哈希、不存在抛出 |
| `deleteAccount` | 1 | 软删除 |
| `getLoginLogs` | 2 | 分页查询、用户名筛选 |

### Sprint 6 第二轮迭代（2026-05-01）：管理后台 API 集成 + 安全加固

管理后台前端 15 个页面全部使用纯 Mock 数据，需对接真实后端 API。同时进行后端安全审查并修复高危漏洞。

#### 管理后台 API 服务层（新增 13 个文件）

**`src/api/` 目录**：

| 文件 | 用途 |
|------|------|
| `client.js` | axios 实例 + 请求拦截（Token 附加、幂等键）+ 响应拦截（Token 刷新、错误码统一处理） |
| `auth.js` | 管理员登录、Token 刷新、修改密码 |
| `dashboard.js` | 数据概览 4 接口（overview / sales-trend / recent-orders / top-products） |
| `products.js` | 雪茄 + 饮品 CRUD（管理员端） |
| `orders.js` | 订单管理（列表 / 详情 / 状态修改 / 退款 / 美团同步） |
| `members.js` | 会员管理（列表 / 详情 / 等级配置） |
| `storedvalue.js` | 储值管理（充值档位 / 等级配置 / 流水 / 调整余额 / 重算等级） |
| `reviews.js` | 评价管理 + 敏感词 CRUD |
| `posters.js` | 海报管理 + 模板配置 |
| `library.js` | 雪茄库（在售 / 参考 / 风味标签）CRUD |
| `accounts.js` | 管理员账号 CRUD + 登录日志 |
| `settings.js` | 系统设置 + 操作日志 + 美团测试 + 店铺公开信息 |
| `statistics.js` | 数据统计（销售 / 分类 / 用户 / 储值 / 导出） |
| `upload.js` | 文件上传（图片） |

#### 基础设施更新

| 文件 | 变更 |
|------|------|
| `vite.config.js` | 新增 `/api` 代理到 `http://localhost:3000` |
| `src/store/useStore.js` | Token 管理（accessToken / refreshToken 持久化 + logout 清理） |

#### 页面 API 集成（全部完成 ✅）

| 页面 | 状态 | 关键变更 |
|------|------|----------|
| 登录页 `login/index.jsx` | ✅ | 替换 mock 为 `POST /api/admin/login`，处理 1005 锁定 / 1006 改密 / 1004 禁用 |
| Dashboard `dashboard/index.jsx` | ✅ | 4 个 API 并行加载，数据格式适配后端（cents→yuan、日期格式） |
| 订单管理 `orders/index.jsx` | ✅ | 分页查询 + 状态筛选 + 详情抽屉 + 状态变更 + 美团同步 |
| 雪茄商品 `products/cigars/index.jsx` | ✅ | CRUD + 分页筛选 + 上下架切换 + priceCents 转换 |
| 饮品商品 `products/drinks/index.jsx` | ✅ | CRUD + 分页筛选 + 上下架切换（参照雪茄） |
| 会员管理 `members/index.jsx` | ✅ | 列表分页/搜索/等级筛选 + 统计卡片 + 详情抽屉（含充值/消费/等级变更 Tab） |
| 储值管理 `storedvalue/index.jsx` | ✅ | 4 Tab：充值档位 CRUD + 折扣提醒配置 + 流水记录 + 等级配置管理 |
| 评价管理 `reviews/index.jsx` | ✅ | 审核/屏蔽/删除 + 敏感词 CRUD |
| 海报管理 `posters/index.jsx` | ✅ | 海报列表 + 模板配置（单例 upsert） |
| 雪茄库 `library/instore/index.jsx` | ✅ | 在售雪茄 CRUD + 同步 |
| 参考库 `library/reference/index.jsx` | ✅ | 参考雪茄 CRUD |
| 风味标签 `library/tags/index.jsx` | ✅ | 风味标签 CRUD |
| 账号管理 `accounts/index.jsx` | ✅ | 管理员 CRUD + 登录日志 |
| 数据统计 `statistics/index.jsx` | ✅ | 4 维度统计并行加载 + 数据导出 |
| 系统设置 `settings/index.jsx` | ✅ | 分组配置 + 操作日志 + 美团测试 + 店铺公开信息 |

#### 后端安全审查与加固

审查 `src/` 全部代码，发现 **2 Critical + 3 High + 4 Medium + 5 Low** 级别安全问题。

**已修复（本轮）**：

| # | 级别 | 修复项 | 文件 |
|---|------|--------|------|
| C-1 | 🔴 Critical | 微信支付回调添加签名验证（RSA-SHA256）+ AES-256-GCM 解密 + nonce 防重放（Redis） | `storedvalue/wechat-callback.controller.ts` |
| C-2 | 🔴 Critical | 美团回调添加 HMAC-SHA256 签名验证 + 签名验证可配置跳过 | `order/meituan-callback.controller.ts` |
| H-1 | 🟠 High | Refresh Token 轮换：使用后删除旧 token + 签发新 token（用户端 + 管理端） | `auth/auth.service.ts`、`auth/admin-auth.service.ts` |
| H-3 | 🟠 High | Swagger 生产环境禁用（仅非 production 环境暴露） | `main.ts` |

**待修复（需外部依赖）**：

| # | 级别 | 问题 | 阻塞 |
|---|------|------|------|
| H-2 | 🟠 High | 微信支付 v3 RSA 签名使用 HMAC 占位 | B1：商户证书申请 |
| M-4 | 🟡 Medium | Session Key Redis 明文存储 | 需设计 KMS 加密方案 |
| M-2 | 🟡 Medium | 部分接口使用内联类型绕过 class-validator | 需逐个改写为 DTO |

**确认安全（良好实践）**：bcrypt cost 12 密码哈希、手机号 AES-256-GCM 加密+脱敏、JWT 双 Token 分离、全局 ValidationPipe、操作日志敏感字段脱敏、幂等多层防御、文件上传 MIME 限制、RBAC 权限守卫全局应用。

#### 测试验证

| 检查项 | 状态 |
|--------|------|
| `pnpm build` 编译零错误 | ✅ |
| `pnpm test` 114 个测试全部通过 | ✅ |

### Sprint 6 第三轮迭代（2026-05-01）：管理后台 Mock 页面迁移收尾

前两轮已迁移 13 个页面，本轮完成最后 2 个 Mock 页面（members / storedvalue）的 API 迁移，并修复 API 客户端与后端的对接问题。

#### 迁移 1：会员管理页 `members/index.jsx`

**变更前**：从 `../../mock/members` 导入硬编码数据，客户端过滤/排序，无分页。
**变更后**：全部切换到真实 API。

| 功能 | 接口 | 说明 |
|------|------|------|
| 会员列表 | `GET /api/admin/members` | 分页 + 关键词搜索 + 充值等级/消费等级筛选 |
| 统计卡片 | `GET /api/admin/members/stats` | 全部/高等级/中等级/入门 4 项统计 |
| 详情抽屉 | `GET /api/admin/members/:id` | 含充值记录/消费记录/等级变更/余额流水 |
| 等级配置 | `GET /api/storedvalue/level-config/:type` | 公开接口，用于计算升级差距 |

**关键适配**：
- 后端返回 `rechargePoints`/`consumptionPoints` 为字符串（BigInt），前端 `toNum()` 转换
- 后端直接返回 `nextRechargeGap`/`nextConsumptionGap`，优先使用
- `lastLogin` → `lastLoginAt`（后端字段名差异）
- 等级配置含 BigInt `minPoints`/`maxPoints`，需转换

#### 迁移 2：储值管理页 `storedvalue/index.jsx`

**变更前**：从 `../../mock/storedvalue` 和 `../../mock/members` 导入全部硬编码数据，所有 CRUD 操作仅本地 setState。
**变更后**：4 个 Tab 全部对接真实后端。

| Tab | 接口 | 操作 |
|-----|------|------|
| 充值档位 | `GET/POST/PUT/DELETE /api/admin/storedvalue/tiers` | 列表、新增、编辑、删除、启停 |
| 折扣与提醒 | `GET/PUT /api/admin/settings` | 读取/保存 `discount_rate`、`birthday_reminder_days`、`new_arrival_notify` |
| 流水记录 | `GET /api/admin/storedvalue/transactions` + `POST .../adjust` | 分页查询 + 手动调整余额（幂等） |
| 等级配置 | `GET/PUT .../level-config` + `POST .../recalculate` | 充值/消费双等级列表、编辑、重算 |

**关键适配**：
- 充值档位 `amountCents`/`bonusCents`（分）↔ 表单 `amount`/`bonus`（元）双向转换
- 等级配置 `minPoints`/`maxPoints` BigInt → Number 转换
- 余额调整 `amountCents` 符号控制增减（正=加款，负=扣款）
- 系统配置 `discount_rate` 等以字符串存储，读取时 parseFloat/parseInt

#### 修复 4：API 客户端对接问题（3 项）

| # | 问题 | 修复 |
|---|------|------|
| F-1 | `storedvalue.js` `getLevelConfigs(type)` 使用路径参数 `/level-config/${type}`，但后端使用查询参数 `?type=` | 改为 `apiClient.get('/admin/storedvalue/level-config', { params: { type } })` |
| F-2 | `storedvalue.js` `recalculateLevels(type)` 发送 `{ type }`，但后端读取 `@Body('levelType')` | 改为发送 `{ levelType }` |
| F-3 | `members.js` 缺少 `getMemberStats()` 函数 | 新增 `getMemberStats()` → `GET /api/admin/members/stats` |

#### 修复 5：后端 DTO 缺陷（1 项）

| # | 问题 | 修复 |
|---|------|------|
| D-1 | `AdjustBalanceDto.amountCents` 有 `@Min(1)` 约束，导致无法传入负值进行余额扣减 | 移除 `@Min(1)`，允许负值（正=加款，负=扣款） |

#### 测试验证

| 检查项 | 状态 |
|--------|------|
| `nest build` 后端编译零错误 | ✅ |
| `vite build` 前端打包成功 | ✅ |
| `pnpm test` 114 个测试全部通过 | ✅ |
| 15/15 管理后台页面 API 集成完成 | ✅ |

### Sprint 6 第四轮迭代（2026-05-01）：小程序前端 API 集成 + 管理后台收尾

小程序 8 个页面全部使用硬编码 MOCK 数据（零 `wx.request` 调用），本轮完成全部页面的 API 迁移，并修复管理后台 4 个残留占位符。

#### 小程序 API 基础设施（新增 2 个文件）

| 文件 | 用途 |
|------|------|
| `Cigar/utils/request.js` | HTTP 客户端封装：wx.request 包装、Token 管理（access/refresh 双 Token 自动刷新）、错误码统一处理、401 自动刷新队列 |
| `Cigar/utils/api.js` | API 服务层：封装全部后端接口（鉴权/商品/购物车/订单/会员/充值/推荐/历史/评价/风味/海报/店铺），后端响应 → 小程序页面格式适配、分→元转换 |

**关键设计**：
- Token 存储于 `wx.storage`，请求时自动附加 `Authorization: Bearer` 头
- 401 自动尝试刷新 token，并发请求排队防止重复刷新
- 后端返回 `{ code, message, data }` 统一解包，业务错误码映射为用户提示
- `api.js` 负责数据适配：后端 `priceCents`/`balanceCents` 等分字段 → 页面期望的元格式

#### 页面 API 迁移（全部完成 ✅）

| 页面 | 状态 | 关键变更 |
|------|------|----------|
| 首页 AI 推荐 `index/index.js` | ✅ | `getRecommendQuestions()` 加载问题 → `getRecommendations(answers)` 获取结果；`addToCart()` 调用真实接口 |
| 雪茄详情 `cigar-detail/cigar-detail.js` | ✅ | `getCigarDetail(id)` 加载雪茄 → `getCigarReviews(id)` 加载评价；`submitReview()` 调用真实接口（敏感词由后端过滤） |
| 购物车 `cart/cart.js` | ✅ | `getCart()` 加载 → `updateCartQty()`/`removeCartItem()` 同步后端；`getCartCount()` 同步角标；乐观更新 + 失败回退 |
| 结算/支付 `checkout/checkout.js` | ✅ | `getCart()` + `getMemberProfile()` 加载订单摘要；`createOrder(idempotencyKey)` + `payOrder()` 完成支付流程；支付成功弹出评价 Modal |
| 会员中心 `club/club.js` | ✅ | `getMemberProfile()` 加载双等级资产 → `getRechargeTiers()` 充值档位 → `getStoreInfo()` 店铺信息；6 项网格：订单/联系客服真实可用，其余 Toast 占位 |
| 历史记录 `history/history.js` | ✅ | `getHistory()` 加载并按日期分组 → 前端 4 Tab 筛选；查看详情/再次购买/生成海报按钮对接 |
| 风味生成 `flavor/flavor.js` | ✅ | `getFlavorTags()` 加载后端标签 → 保持本地 TAG_SCORE_MAP 作为后备；`addTastingRecord()` 记录品鉴 |
| 海报生成 `poster/poster.js` | ✅ | `getCigarDetail()` 获取风味标签 → `createPoster()` 保存记录；`analyzeVoice()` 语音分析；Canvas 渲染逻辑保留 |

#### 新增页面（2 个）

| 页面 | 文件 | 功能 |
|------|------|------|
| 我的订单 | `pages/orders/index.*` | 订单列表（状态 Tab 切换：全部/待支付/已支付/已完成）、分页加载、订单详情入口、待支付订单快捷支付 |
| 储值明细 | `pages/member-transactions/index.*` | 储值流水列表（类型 Tab 切换：全部/充值/消费/退款）、分页加载、金额/余额展示 |

在 `app.json` 中注册了 2 个新页面，共计 10 个页面。

#### 管理后台残留占位符修复（4 项）

| # | 文件 | 修复 | 说明 |
|---|------|------|------|
| F-1 | `posters/index.jsx` | LOGO 上传 + 海报预览 | `beforeUpload` 对接 `uploadImage()` API；预览按钮改为 `window.open('/api/posters/:id')` |
| F-2 | `settings/index.jsx` | LOGO 上传 | `beforeUpload` 对接 `uploadImage()` API，上传成功后回填表单 |
| F-3 | `library/instore/index.jsx` | 导出备份 | `onClick` 改为 `window.open('/api/admin/export/cigars')` |
| F-4 | `store/useStore.js` | pendingOrders 默认值 | `3` → `0`（应由 API 动态获取） |

#### 测试验证

| 检查项 | 状态 |
|--------|------|
| `nest build` 后端编译零错误 | ✅ |
| `vite build` 前端打包成功 | ✅ |
| `pnpm test` 114 个测试全部通过 | ✅ |
| 小程序 10/10 页面 API 集成完成 | ✅ |
| 管理后台 4/4 占位符修复 | ✅ |

### Sprint 6 第五轮迭代（2026-05-02）：可观测性基础设施

Sprint 6 剩余任务大多被外部依赖阻塞（微信支付商户号、美团备案、生产服务器），本轮在代码层面完成不依赖外部资源的可观测性工作。

#### Prometheus 指标模块（新增 4 个文件）

在 NestJS 后端中集成 `prom-client`，暴露 `/api/metrics` 端点供 Prometheus 抓取。

**新增文件**：
- `src/metrics/metrics.module.ts` — 全局模块，注册 Prometheus 指标服务 + HTTP 拦截器
- `src/metrics/metrics.service.ts` — 业务指标定义与收集（HTTP 指标 + 12 个业务 Counter/Histogram/Gauge）
- `src/metrics/metrics.controller.ts` — `/api/metrics` 端点（`@ApiExcludeController`，不暴露在 Swagger）
- `src/metrics/metrics.interceptor.ts` — HTTP 请求拦截器（自动记录 method/path/status_code/duration）

**指标清单**：

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `cigarpro_http_requests_total` | Counter | HTTP 请求总数（method, path, status_code） |
| `cigarpro_http_request_duration_seconds` | Histogram | HTTP 请求耗时（9 个 bucket: 0.01~10s） |
| `cigarpro_orders_created_total` | Counter | 订单创建总数（pay_method） |
| `cigarpro_orders_paid_total` | Counter | 订单支付成功总数（channel: balance/meituan） |
| `cigarpro_orders_cancelled_total` | Counter | 订单取消总数（reason） |
| `cigarpro_orders_refunded_total` | Counter | 退款成功总数（channel） |
| `cigarpro_recharges_completed_total` | Counter | 充值完成总数（tier_id） |
| `cigarpro_payment_callbacks_received_total` | Counter | 支付回调接收总数（channel, is_replay） |
| `cigarpro_payment_callback_verify_failed_total` | Counter | 回调验签失败总数（channel） |
| `cigarpro_refunds_failed_total` | Counter | 退款失败总数（channel） |
| `cigarpro_level_changes_total` | Counter | 等级变更总数（type, direction, trigger） |
| `cigarpro_nodejs_event_loop_lag_seconds` | Gauge | Node.js 事件循环延迟 |

**业务埋点位置**：
| 埋点 | 文件 | 触发时机 |
|------|------|----------|
| 订单创建 | `order/order.service.ts` | 非幂等命中时 |
| 订单取消 | `order/order.service.ts` | cancelOrder 成功后 |
| 余额支付成功 | `order/payment.service.ts` | 非幂等命中时 |
| 退款成功 | `order/refund.service.ts` | 退款 status='success' |
| 微信回调接收 | `storedvalue/wechat-callback.controller.ts` | 回调到达（含重放检测） |
| 微信回调验签失败 | `storedvalue/wechat-callback.controller.ts` | 验签不通过 |
| 充值完成 | `storedvalue/wechat-callback.controller.ts` | 非幂等非跳过的成功回调 |
| 美团回调接收 | `order/meituan-callback.controller.ts` | 回调到达（含重放检测） |
| 美团支付成功 | `order/meituan-callback.controller.ts` | trade_state=SUCCESS |

**新增依赖**：
- `prom-client` 15.1.3

#### k6 压测脚本（新增 6 个文件）

**`tests/k6/` 目录**：

| 文件 | 场景 | 并发 |
|------|------|------|
| `common.js` | 共享工具：BASE_URL、认证头、幂等键生成、4 级负载配置 | — |
| `inventory-rush.js` | 库存抢购（验证不卖超） | 0→100 VU |
| `payment-concurrency.js` | 并发支付（验证幂等防御） | 0→200 VU 尖峰 |
| `recharge-concurrency.js` | 并发充值回调（验证幂等入账） | 0→100 VU |
| `mixed-workload.js` | 混合用户负载（浏览/加购/下单/支付） | 0→50 VU |
| `admin-workload.js` | 管理后台负载（Dashboard/订单/会员） | 0→50 VU |

**4 级负载配置**：
- `SMOKE_OPTIONS`：1 VU 10s（CI 冒烟）
- `LOAD_OPTIONS`：0→50→0 VU 2min（日常负载）
- `STRESS_OPTIONS`：0→100→0 VU 4.5min（压力测试）
- `SPIKE_OPTIONS`：10→200→10 VU 1min（尖峰测试）

#### Grafana 监控面板（新增 1 个文件）

**`deploy/grafana/cigarpro-dashboard.json`**：
- 21 个面板覆盖 5 个核心区域：API 概览、业务交易、支付回调健康、Node.js 运行时
- 兼容 Grafana + Prometheus datasource
- 可一键导入（Dashboard → Import → Upload JSON）

#### 修改文件清单（1 个文件）

- `src/app.module.ts` — 注册 MetricsModule（全局模块）

#### 测试验证

| 检查项 | 状态 |
|--------|------|
| `nest build` 编译零错误 | ✅ |
| `pnpm test` 114 个测试全部通过 | ✅ |

### Sprint 6 后续任务

| # | 任务 | 优先级 | 阻塞 |
|---|------|--------|------|
| S6-1 | ✅ 路由前缀修复 | P0 | — |
| S6-2 | ✅ 管理员账号管理模块 | P0 | — |
| S6-3 | ✅ 美团回调接口 | P0 | — |
| S6-4 | ✅ 管理后台 API 集成（15/15 页面全部完成） | P0 | — |
| S6-5 | ✅ 安全审查 + 4 项高危修复 | P0 | — |
| S6-6 | ✅ 小程序前端 API 集成（10/10 页面） | P0 | — |
| S6-1 | ✅ 路由前缀修复 | P0 | — |
| S6-2 | ✅ 管理员账号管理模块 | P0 | — |
| S6-3 | ✅ 美团回调接口 | P0 | — |
| S6-4 | ✅ 管理后台 API 集成（15/15 页面全部完成） | P0 | — |
| S6-5 | ✅ 安全审查 + 4 项高危修复 | P0 | — |
| S6-6 | ✅ 小程序前端 API 集成（10/10 页面） | P0 | — |
| S6-7 | ✅ k6 压测脚本（含 README，5 个场景 × 4 级负载） | P1 | 待测试环境执行 |
| S6-8 | ⬜ 微信支付沙箱→生产切换 | P0 | B1 |
| S6-9 | ⬜ 美团生产联调 | P1 | B3 |
| S6-10 | ✅ 运维 Runbook（`docs/backend/06_部署与运维Runbook.md` 已包含部署/监控/备份/故障 SOP） | P1 | 已完成 |
| S6-11 | ✅ Prometheus 指标端点 + Grafana 面板 JSON | P1 | 待生产环境部署 |
| S6-12 | ⬜ 灰度发布 → 全量发布 | P0 | B4 |

---

## 阻塞与待决事项

| # | 问题 | 影响 Sprint | 负责人 | 状态 |
|---|------|------------|--------|------|
| B1 | 微信支付商户号 + 证书（v3）待申请 | Sprint 2 | — | ⬜ 待处理 |
| B2 | 腾讯云 COS Bucket 权限配置 | Sprint 1 | — | ⬜ 待处理 |
| B3 | 美团商户备案资料准备 | Sprint 5 | — | ⬜ 待处理 |
| B4 | 生产服务器（微信云托管/K8s）资源申请 | Sprint 6 | — | ⬜ 待处理 |

---

## 参考文档

| 文档 | 用途 |
|------|------|
| `Plan.md` | 总设计方案（Sprint 计划在 §8，接口清单在 §1.2） |
| `docs/backend/00_新人开发上手指南.md` | 第 1 天环境搭建步骤 |
| `docs/backend/01_项目结构与编码规范.md` | NestJS 目录结构 + 编码模板 |
| `docs/backend/02_数据库完整DDL.sql` | 可直接执行的建表脚本（含 SEED） |
| `docs/backend/02_数据库设计补充.md` | 索引策略、约束推理、触发器 |
| `docs/backend/03_关键场景实现指南.md` | 幂等 / 事务 / 锁 / 库存 / 等级 / 推荐 6 大场景代码模板 |
| `docs/backend/04_支付与对账详细设计.md` | 微信支付 v3 验签、退款决策、对账 SOP |
| `docs/backend/05_测试用例清单.md` | 单元/集成/并发/沙箱端到端测试用例 |
| `docs/backend/06_部署与运维Runbook.md` | 三环境部署、灰度、监控、故障应急 |
