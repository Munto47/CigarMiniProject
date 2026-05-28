# 06 · 部署与运维 Runbook

> **目标读者**：运维 / SRE / 后端值班工程师
> **目标产出**：照着此文档可独立完成三环境部署、灰度、监控、备份恢复、故障应急
> **配套阅读**：`Plan.md §9`、`04_支付与对账详细设计.md §9`

本文档涵盖：

1. [三环境拓扑](#1-三环境拓扑)
2. [部署流程](#2-部署流程)
3. [配置管理](#3-配置管理)
4. [灰度与回滚](#4-灰度与回滚)
5. [监控告警](#5-监控告警)
6. [备份与恢复](#6-备份与恢复)
7. [日常运维](#7-日常运维)
8. [故障应急 SOP](#8-故障应急-sop)
9. [容量规划](#9-容量规划)

---

## 1. 三环境拓扑

### 1.1 环境一览

| 环境 | 用途 | 域名（示意） | 数据 |
|---|---|---|---|
| **dev** | 本地开发 | `localhost:3000` | docker compose（PG/Redis/MinIO） |
| **staging** | 预发布 / QA | `staging.cigar.ruimacode.cn` | 独立云数据库（小规格），定期从 prod 脱敏拷贝 |
| **prod** | 生产 | `cigar.ruimacode.cn` | 独立云数据库（高可用主从） |

### 1.2 prod 推荐拓扑

```
       ┌──────────────┐
       │  小程序 / Web │
       └──────┬───────┘
              │ HTTPS
       ┌──────▼───────┐
       │   CDN / WAF  │   流量清洗、限速
       └──────┬───────┘
              │
       ┌──────▼───────┐
       │  Nginx / SLB │   2~3 实例（多 AZ）
       └──────┬───────┘
              │
   ┌──────────┼──────────┐
   │          │          │
┌──▼──┐    ┌──▼──┐    ┌──▼──┐
│ App │    │ App │    │ App │     N 实例（API 服务，2~3 个起步）
└──┬──┘    └──┬──┘    └──┬──┘
   │          │          │
   └──────────┼──────────┘
              │
   ┌──────────┴──────────┐
   │                     │
┌──▼──────┐         ┌────▼────┐
│ Worker  │         │ Worker  │     2 实例（BullMQ 消费者：cron / 推送 / 对账）
└──┬──────┘         └────┬────┘
   │                     │
   └──────────┬──────────┘
              │
   ┌──────────┼──────────┬─────────┐
   │          │          │         │
┌──▼──┐  ┌────▼───┐  ┌───▼───┐ ┌───▼───┐
│ PG  │  │ Redis  │  │  COS  │ │  KMS  │
│主从 │  │主从+哨兵│  │       │ │       │
└─────┘  └────────┘  └───────┘ └───────┘
```

### 1.3 资源规格（参考起步）

| 组件 | 规格 | 数量 |
|---|---|---|
| App | 2C 4G | 2~3（按 RPS 扩） |
| Worker | 2C 4G | 2 |
| PG | 4C 16G + SSD 200G | 主+从 |
| Redis | 2C 4G | 主+从 + 哨兵 3 |
| COS bucket | — | 1 |

---

## 2. 部署流程

### 2.1 镜像构建

```dockerfile
# Cigar_server/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate && pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

构建：

```bash
docker build -t cigarpro-api:$(git rev-parse --short HEAD) Cigar_server/
docker tag cigarpro-api:$(git rev-parse --short HEAD) registry.example.com/cigarpro-api:$(git rev-parse --short HEAD)
docker push registry.example.com/cigarpro-api:$(git rev-parse --short HEAD)
```

### 2.2 Helm Values（K8s）

```yaml
# helm/cigarpro/values.prod.yaml
image:
  repository: registry.example.com/cigarpro-api
  tag: ""    # CI 注入
replicaCount: 3
resources:
  requests: { cpu: 500m, memory: 512Mi }
  limits:   { cpu: 2000m, memory: 4Gi }
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /health/ready, port: 3000 }
  periodSeconds: 5
env:
  NODE_ENV: production
  DATABASE_URL: { valueFrom: { secretKeyRef: { name: cigarpro-secrets, key: DATABASE_URL } } }
  REDIS_URL:    { valueFrom: { secretKeyRef: { name: cigarpro-secrets, key: REDIS_URL } } }
  KMS_PROVIDER: tencent
volumes:
  - name: wechatpay-cert
    secret: { secretName: wechatpay-cert }
volumeMounts:
  - name: wechatpay-cert
    mountPath: /etc/wechatpay
    readOnly: true
```

### 2.3 微信云托管（备选）

按 Plan.md §9.2 路线，直接通过云托管控制台部署。需注意：
- 业务域名要在微信支付商户平台备案
- 启动前检查 `/health` 返回 200
- 自动伸缩规则：CPU > 70% 加实例，< 30% 缩

### 2.4 部署 Checklist

```
[ ] 代码已 merge 到 main
[ ] CI 全绿（单元+集成测试覆盖率达标）
[ ] release 分支 tag：v1.x.y
[ ] 改动了 DDL？→ 先在 staging 跑 prisma migrate deploy
[ ] 改动了 .env？→ 已更新 K8s secret / KMS
[ ] 改动了 cron？→ Worker 是否要重启
[ ] PR 已通知前端、QA、产品
[ ] 灰度方案已确认（10% → 50% → 100%）
[ ] 回滚预案：上一个版本 tag 已记录
[ ] 公告：是否需要发送给店员/用户
```

---

## 3. 配置管理

### 3.1 配置分层

```
┌─────────────────────────────────┐
│ KMS（敏感）                      │  WECHATPAY_API_V3_KEY、AES_MASTER_KEY、JWT_SECRET
├─────────────────────────────────┤
│ K8s Secret（半敏感）             │  DATABASE_URL、REDIS_URL、COS_SECRET_KEY
├─────────────────────────────────┤
│ ConfigMap / values.yaml（公开）  │  NODE_ENV、PORT、域名、限流配置
├─────────────────────────────────┤
│ DB system_settings（业务）       │  店铺地址、客服电话、礼品规则等业务可调参数
└─────────────────────────────────┘
```

### 3.2 启动校验

`src/config/config.module.ts`：

```ts
@Module({})
export class ConfigModule {
  static forRoot(): DynamicModule {
    const raw = process.env;
    const parsed = ConfigSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('环境变量校验失败：', parsed.error.format());
      process.exit(1);
    }
    return {
      module: ConfigModule,
      providers: [{ provide: 'APP_CONFIG', useValue: parsed.data }],
      exports: ['APP_CONFIG'],
      global: true,
    };
  }
}
```

**禁止**：`process.env.XXX` 散落在业务代码。统一从 `ConfigService` 读。

### 3.3 改 system_settings 流程

业务可调参数（如订单超时分钟数）放 `system_settings` 表。改动需要：
1. 管理后台界面（带 RBAC + operation_log）
2. 立即生效（App 内存缓存 5 分钟刷新一次或主动失效）
3. 重要改动（订单超时 / 等级阈值）走变更管理流程

---

## 4. 灰度与回滚

### 4.1 灰度策略

**第一档（10%）**：1/3 实例切新版。运行 30 分钟监控错误率与 P99 延迟。

**第二档（50%)**：扩到 50%，运行 1 小时。

**第三档（100%）**：全量，再观察 24 小时。

K8s Deployment 配 `maxSurge=1, maxUnavailable=0`，配合 service mesh（如 Istio）权重切流。

### 4.2 回滚（K8s）

```bash
kubectl rollout history deployment/cigarpro-api
kubectl rollout undo deployment/cigarpro-api --to-revision=N
kubectl rollout status deployment/cigarpro-api
```

回滚的"窗口"：5 分钟内能完成。

### 4.3 不能简单回滚的场景

- **DDL 已生效且不可逆**：例如 ALTER COLUMN 删字段。回滚要走 forward fix，不要 DROP COLUMN 回去。
- **数据已写入新结构**：需要数据迁移补救。
- **回调外部已切换 URL**：要先反向切换。

针对这些，DDL 必须设计为**两阶段兼容**（先加新字段双写 → 切读 → 删旧字段）。

---

## 5. 监控告警

### 5.1 监控栈

| 层级 | 工具 |
|---|---|
| 指标 | Prometheus + Grafana |
| 日志 | Loki / ELK |
| 链路追踪 | OpenTelemetry + Jaeger |
| 告警 | AlertManager → 企微 / 电话（PagerDuty 等） |

### 5.2 关键指标

```
# 应用层
http_requests_total{method,path,status}        # 5xx 占比
http_request_duration_seconds{quantile=0.99}   # P99
nestjs_event_loop_lag_seconds                  # 事件循环延迟

# 业务
order_create_total
order_pay_success_total / order_pay_failed_total
recharge_callback_total / recharge_callback_dup_total
refund_failed_total
level_change_total

# DB
pg_up
pg_stat_database_xact_commit_total
pg_stat_database_xact_rollback_total
pg_locks_count                                # 长锁
pg_stat_replication_lag_bytes                 # 主从延迟

# Redis
redis_up
redis_connected_clients
redis_memory_used_bytes
```

### 5.3 告警规则（节选）

```yaml
groups:
- name: cigarpro
  rules:
  # 严重：电话告警
  - alert: HighErrorRate
    expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels: { severity: critical }
    annotations: { summary: "5xx 错误率 > 5%" }

  - alert: PaymentCallbackFailLoop
    expr: increase(payment_callback_verify_failed_total[10m]) > 50
    for: 5m
    labels: { severity: critical }

  - alert: ReconciliationDiff
    expr: reconciliation_diff_count > 0
    labels: { severity: critical }

  - alert: DBReplicationLagHigh
    expr: pg_stat_replication_lag_bytes > 50e6   # > 50MB
    for: 10m
    labels: { severity: critical }

  # 警告：企微通知
  - alert: HighP99
    expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 10m
    labels: { severity: warning }

  - alert: OrderPendingTooMany
    expr: orders_pending_count > 10000
    labels: { severity: warning }
```

### 5.4 告警分级

| 级别 | 渠道 | 响应 SLA |
|---|---|---|
| **P0 critical** | 电话 + 短信 + 企微 | 15 分钟内有人响应 |
| **P1 warning** | 企微 | 1 小时内有人查看 |
| **P2 info** | 仅日志 | 不要求实时 |

---

## 6. 备份与恢复

### 6.1 PG 备份策略

| 类型 | 频率 | 保留 |
|---|---|---|
| 全量备份（pg_basebackup / 云厂商快照） | 每日 03:00 | 30 天 |
| WAL 归档（PITR 用） | 实时 | 7 天 |
| 跨区备份 | 每日 04:00 | 30 天 |

> RPO 目标 ≤ 5 分钟（WAL 实时归档）；RTO 目标 ≤ 1 小时（恢复演练）。

### 6.2 Redis 备份

- AOF appendonly=yes，每秒同步
- 主从 + 哨兵
- RDB 每天 1 次，保留 7 天

> Redis 主要是缓存，丢失幂等 key 由 DB 唯一约束兜底。

### 6.3 COS（对象存储）备份

- 跨区复制
- 版本控制开启（防误删）

### 6.4 恢复演练

**每月一次**，必须真跑：
1. 从最新全量 + WAL 恢复到一个独立 PG 实例
2. 跑资金核对脚本，验证不变量
3. 应用连过去验证关键查询正常

```bash
# 示例：基于云厂商快照恢复 + WAL 重放
pg_restore -h restore-host -U cigarpro -d cigarpro_restore latest.dump
psql -h restore-host -U cigarpro -d cigarpro_restore -f reconcile.sql
```

---

## 7. 日常运维

### 7.1 每日

- [ ] 看 Grafana 总览（错误率 / P99 / RPS / 库存预占趋势）
- [ ] 资金核对脚本结果检视（02:30 后）
- [ ] 微信对账报告检视
- [ ] 慢查询日志（> 500ms）扫一眼
- [ ] 关注 P1 告警是否未关闭

### 7.2 每周

- [ ] PG 索引使用情况（`pg_stat_user_indexes` 零使用率索引）
- [ ] `operation_logs.before_data/after_data` 大小是否失控
- [ ] BullMQ 失败队列检查
- [ ] KMS 访问日志抽查

### 7.3 每月

- [ ] 备份恢复演练
- [ ] 容量评估（DB 大小 / Redis 内存 / COS 用量）
- [ ] 操作日志归档（> 90 天 → archive 表）
- [ ] 安全补丁（基础镜像 / Node / PG）
- [ ] 灰度策略复盘

### 7.4 每季

- [ ] JWT secret 轮换
- [ ] 微信支付 API v3 key 轮换（与微信侧同步）
- [ ] DBA 巡检（VACUUM / 死元组 / 锁等待）
- [ ] 灾难恢复演练（核心服务全停 → 恢复）

---

## 8. 故障应急 SOP

### 8.1 通用流程

```
告警触发
   │
   ├─→ on-call 工程师 5 分钟内 ack
   │
   ├─→ 创建临时事故频道（企微群 / Slack）
   │
   ├─→ 4 个动作并行：
   │   1. 止血：先恢复（回滚 / 限流 / 切流量）
   │   2. 评估：影响范围、波及用户数
   │   3. 沟通：通知产品、客服
   │   4. 取证：保留日志 / 数据库快照
   │
   ├─→ 复盘（24 小时内）：根因 + Action Item
   └─→ 故障报告归档
```

### 8.2 典型故障与处置

#### 8.2.1 大量 5xx

**症状**：`http_requests_total{status=~"5.."}` 飙升。

**第一步**：`kubectl logs --tail=200` 看错误。常见原因：
- DB 连不上 → 看 PG 状态、连接池
- 业务异常未捕获 → 立即回滚到上版本
- 第三方服务挂了（微信 / 美团）→ 限流降级

**第二步**：限流 `ThrottlerGuard` 全局限制翻倍下调，避免雪崩。

**第三步**：实在搞不清，回滚到上一个稳定 tag。

#### 8.2.2 资金对账差异

**症状**：每日对账脚本返回非 0 行 / `reconciliation_reports.has_issue=true`。

**第一步**：**立即冻结改动**。不要急着改数据。

**第二步**：定位差异类型：
- 余额对不上：哪个 user？查 `balance_transactions` 看哪笔异常
- 订单对不上：哪个 order？查 `payment_records` 与 `payment_callbacks`
- 微信对账 diff：本地有微信无 → 可能是测试数据；微信有本地无 → 立即查回调日志

**第三步**：人工补单（详见 04 §8）。**走 service 层，不要直接 SQL 改业务表**。

**第四步**：复盘——为什么前面的防线没挡住？修复防线（增加约束、加测试）。

#### 8.2.3 库存超卖

**症状**：用户投诉买到超过库存的商品。

**第一步**：SQL 查 `cigars` 该 cigar_id 的 `stock` 与 `stock_locked`，是否真的超过：

```sql
SELECT id, stock, stock_locked, stock - stock_locked AS available
  FROM cigars WHERE id = $1;
```

**第二步**：如果真超卖，看是订单上的数量超过实际库存：
- 优先安抚用户（联系客服换货 / 退款）
- 排查代码：是否有地方绕过了 `WHERE stock - stock_locked >= qty` 检查
- 紧急下架该商品 `UPDATE cigars SET status='inactive'`

**第三步**：复盘 + 加测试用例。

#### 8.2.4 微信回调全部失败

**症状**：`payment_callback_verify_failed_total` 暴增。

**第一步**：检查微信平台证书是否过期：
```ts
await this.certManager.refresh();   // 强制刷新
```

**第二步**：检查 `WECHATPAY_API_V3_KEY` 是否被人改了。从 KMS 查最新值。

**第三步**：如果是微信侧故障：
- cron 兜底会自动补充入账（5 分钟）
- 通知客服回复用户「钱到账可能延迟，但不会丢」
- 业务**不要**手动改 DB

#### 8.2.5 美团 out_of_sync

**症状**：`orders.status='out_of_sync'`，电话告警。

**第一步**：用美团商户后台手动查询 `order_no`。

**第二步**：根据美团显示状态：
- 已支付 → 走 §8.2 补单脚本
- 未支付 → 关单 `cancelled, reason='meituan_unpaid'`
- 美团那边查无 → 数据严重不一致，转给数据中心人工处理

#### 8.2.6 PG 主库 down

**症状**：所有写接口失败，监控 `pg_up=0`。

**第一步**：从库提升为新主（云厂商一键切换或手动 promote）。

**第二步**：App 配置切换（更新 DATABASE_URL secret，滚动重启 App）。

**第三步**：故障主修复后作为新从加入集群。

**RPO**：≤ 5 分钟（WAL 复制延迟内）。

#### 8.2.7 Redis down

**症状**：幂等 SETNX 失败、限流失效。

**第一步**：从库提升为新主（哨兵自动）。

**第二步**：App 重连。

**幂等怎么办**：DB 唯一约束兜底，业务正常运行。**不要**因此关闭幂等检查。

---

## 9. 容量规划

### 9.1 单实例承载

| 资源 | 每实例 | 备注 |
|---|---|---|
| App | ~150 RPS | 大部分请求 < 50ms |
| PG（4C16G） | ~3000 QPS（读）/ ~500 TPS（写） | SSD |
| Redis | 万级 QPS | 单实例足够 MVP |

### 9.2 扩展信号

```
应用：
- CPU 持续 > 70% → 加实例
- p99 持续 > 500ms → 看慢查询，必要加实例

DB：
- 连接数 > 80% → 调大或加 PgBouncer
- 写 TPS > 80% → 读写分离 / 分表
- 大表 > 1 亿行（operation_logs / payment_callbacks）→ 归档

Redis：
- 内存 > 70% → 加节点 / 优化 key TTL
```

### 9.3 半年到一年的扩容路径

```
v1.0 (MVP)
├─ 2 App + 1 Worker + PG 主从 + Redis 主从
│
v1.5 (用户突破 5 万)
├─ 加 PgBouncer，连接池优化
├─ App 4 实例
├─ 慢查询治理
│
v2.0 (用户突破 20 万)
├─ 读写分离（统计走从库）
├─ Redis Cluster
├─ operation_logs 分表（按月分区）
├─ COS 改用 CDN 回源
│
v3.0 (用户突破 100 万 / 多门店)
├─ DB 按门店分库
├─ 引入消息中间件（Kafka）替代 BullMQ 高吞吐场景
├─ 服务拆分（auth / order / payment 各自独立部署）
```

---

## 10. 应急联系人

| 角色 | 联系方式（示意）| 负责 |
|---|---|---|
| 值班工程师 | xxx | 7×24 一线响应 |
| 后端 owner | xxx | 业务深入排查 |
| DBA | xxx | DB 故障 |
| SRE / 平台 | xxx | K8s / 网络 |
| 微信支付对接 | 微信支付服务商 | 支付通道故障 |
| 美团对接 | 美团商户服务 | 美团故障 |
| 安全 | xxx | 安全事件 |

值班排班表：见公司值班系统。

---

> **写给所有人**：运维不是消防员是医生。**预防 > 监控 > 应急**。文档要随系统演进同步改，否则下次故障它救不了你。

