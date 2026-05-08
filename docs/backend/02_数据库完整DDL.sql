-- ============================================================================
-- CigarPro 数据库完整 DDL（v2.0）
-- 用法： psql -U cigarpro -d cigarpro_dev -f 02_数据库完整DDL.sql
-- 或：   docker exec -i pg-container psql -U cigarpro -d cigarpro_dev < 02_数据库完整DDL.sql
-- ============================================================================
--
-- 本文件吸收一轮设计评审的全部 P0/P1 修订（详见 Plan.md §3.2）：
--   1. balance_transactions / point_transactions 加幂等唯一索引
--   2. poster_templates 改为 SMALLINT PK CHECK(id=1)（修语法 bug）
--   3. cigars / drinks 加 stock_locked
--   4. orders 加 refunded_amount_cents
--   5. level_configs 加 EXCLUDE 防重叠
--   6. payment_records.status 移除 'refunded'
--   7. orders.meituan_synced 改为 5 状态 sync_status + 重试字段
--   8. orders.idempotency_key 持久化
--   9. order_items.actual_amount_cents
--   10. users.phone 改为 phone_encrypted/phone_mask
--   11. 删除 cigars.ai_tags（标签统一走 cigar_tags + flavor_tags）
--   12. cigars.rating_avg/rating_count 由触发器维护
--   13. admins 删除 failed_attempts，加 password_changed_at / must_change_password
--   14. categories 主键改为 (type, code)；cigars/drinks 加 category_type 冗余 + FK
--   15. reviews.order_id NOT NULL；唯一 (order_id, cigar_id)
--   16. payment_callbacks 加 received_count
--   17. recharge_tiers.amount_cents CHECK >= 1
--   18. operation_logs JSONB 4KB 截断 + 90 天归档（应用层处理）
--   19. 一期建 reconciliation_reports
--   20. 完整 SEED 数据
-- ============================================================================

-- ============================================================================
-- 0. 扩展
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;     -- 用于 level_configs 区间不重叠
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()

-- ============================================================================
-- 1. 用户域
-- ============================================================================

CREATE TABLE users (
  id                BIGSERIAL PRIMARY KEY,
  openid            VARCHAR(64)  NOT NULL,
  unionid           VARCHAR(64),
  nickname          VARCHAR(64)  NOT NULL DEFAULT '微信用户',
  avatar_url        TEXT,
  phone_encrypted   BYTEA,                                -- KMS AES-256-GCM 加密
  phone_mask        VARCHAR(20),                          -- 138****5678
  birthday          DATE,
  gender            SMALLINT     DEFAULT 0,               -- 0 未知 1 男 2 女
  status            SMALLINT     NOT NULL DEFAULT 1,      -- 1 正常 0 封禁
  last_login_at     TIMESTAMPTZ,
  last_login_ip     INET,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uniq_users_openid UNIQUE (openid)
);
CREATE INDEX idx_users_unionid    ON users(unionid)    WHERE unionid    IS NOT NULL;
CREATE INDEX idx_users_phone_mask ON users(phone_mask) WHERE phone_mask IS NOT NULL;

CREATE TABLE member_profiles (
  user_id              BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_cents        BIGINT       NOT NULL DEFAULT 0  CHECK (balance_cents >= 0),
  recharge_level       SMALLINT     NOT NULL DEFAULT 1  CHECK (recharge_level    BETWEEN 1 AND 9),
  consumption_level    SMALLINT     NOT NULL DEFAULT 1  CHECK (consumption_level BETWEEN 1 AND 9),
  recharge_points      BIGINT       NOT NULL DEFAULT 0  CHECK (recharge_points    >= 0),
  consumption_points   BIGINT       NOT NULL DEFAULT 0  CHECK (consumption_points >= 0),
  total_recharge_cents BIGINT       NOT NULL DEFAULT 0,
  total_spend_cents    BIGINT       NOT NULL DEFAULT 0,
  order_count          INT          NOT NULL DEFAULT 0,
  login_count          INT          NOT NULL DEFAULT 0,
  version              INT          NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_recharge_level    ON member_profiles(recharge_level);
CREATE INDEX idx_mp_consumption_level ON member_profiles(consumption_level);

-- ============================================================================
-- 2. 管理员域 (RBAC)
-- ============================================================================

CREATE TABLE admins (
  id                      BIGSERIAL PRIMARY KEY,
  username                VARCHAR(64)  NOT NULL,
  name                    VARCHAR(64)  NOT NULL,
  password_hash           VARCHAR(255) NOT NULL,
  role_code               VARCHAR(32)  NOT NULL,
  status                  SMALLINT     NOT NULL DEFAULT 1,
  must_change_password    BOOLEAN      NOT NULL DEFAULT TRUE,
  password_changed_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  locked_until            TIMESTAMPTZ,
  last_login_at           TIMESTAMPTZ,
  last_login_ip           INET,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ,
  CONSTRAINT uniq_admins_username UNIQUE (username)
);

CREATE TABLE roles (
  code        VARCHAR(32)  PRIMARY KEY,
  name        VARCHAR(64)  NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  code        VARCHAR(64)  PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  module      VARCHAR(32)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_code        VARCHAR(32) NOT NULL REFERENCES roles(code)        ON DELETE CASCADE,
  permission_code  VARCHAR(64) NOT NULL REFERENCES permissions(code)  ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE admin_login_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT,
  username    VARCHAR(64) NOT NULL,
  result      VARCHAR(16) NOT NULL CHECK (result IN ('success','failed','locked')),
  reason      VARCHAR(64),
  ip          INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_all_username_created ON admin_login_logs(username, created_at DESC);

CREATE TABLE operation_logs (
  id            BIGSERIAL PRIMARY KEY,
  admin_id      BIGINT NOT NULL,
  admin_name    VARCHAR(64) NOT NULL,
  module        VARCHAR(32) NOT NULL,
  action        VARCHAR(64) NOT NULL,
  target_type   VARCHAR(32),
  target_id     VARCHAR(64),
  description   TEXT,
  before_data   JSONB,                                 -- 应用层限制 4KB
  after_data    JSONB,                                 -- 应用层限制 4KB
  level         VARCHAR(16) NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','error')),
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oplogs_admin_created ON operation_logs(admin_id, created_at DESC);
CREATE INDEX idx_oplogs_module_action ON operation_logs(module, action, created_at DESC);
CREATE INDEX idx_oplogs_created       ON operation_logs(created_at);

-- ============================================================================
-- 3. 商品域
-- ============================================================================

-- 修订：categories 主键改为 (type, code)，便于 cigars/drinks 直接 FK
CREATE TABLE categories (
  type        VARCHAR(16) NOT NULL CHECK (type IN ('cigar','drink')),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(64) NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (type, code)
);

CREATE TABLE cigars (
  id                 BIGSERIAL PRIMARY KEY,
  name               VARCHAR(128) NOT NULL,
  brand              VARCHAR(64)  NOT NULL,
  model              VARCHAR(64),
  spec               VARCHAR(32)  NOT NULL DEFAULT '单支',
  category_type      VARCHAR(16)  NOT NULL DEFAULT 'cigar' CHECK (category_type = 'cigar'),
  category_code      VARCHAR(64)  NOT NULL,
  origin             VARCHAR(64),
  year               VARCHAR(16),
  wrapper            VARCHAR(64),
  strength           VARCHAR(32),
  duration           VARCHAR(32),
  price_cents        BIGINT       NOT NULL CHECK (price_cents        >= 0),
  member_price_cents BIGINT       NOT NULL CHECK (member_price_cents >= 0),
  stock              INT          NOT NULL DEFAULT 0 CHECK (stock        >= 0),
  stock_locked       INT          NOT NULL DEFAULT 0 CHECK (stock_locked >= 0 AND stock_locked <= stock),
  rating_avg         NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count       INT          NOT NULL DEFAULT 0,
  flavor_start       TEXT,
  flavor_mid         TEXT,
  flavor_end         TEXT,
  flavor_scores      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  scenes             TEXT[]       NOT NULL DEFAULT '{}',
  segments           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  ai_flavor_analysis JSONB,
  hero_image_url     TEXT,
  thumb_url          TEXT,
  status             VARCHAR(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','soldout')),
  is_new             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,
  CONSTRAINT fk_cigars_category FOREIGN KEY (category_type, category_code)
    REFERENCES categories(type, code)
);
CREATE INDEX idx_cigars_status_cat  ON cigars(status, category_code);
CREATE INDEX idx_cigars_brand       ON cigars(brand);
CREATE INDEX idx_cigars_scenes_gin  ON cigars USING GIN (scenes);

CREATE TABLE drinks (
  id                 BIGSERIAL PRIMARY KEY,
  name               VARCHAR(128) NOT NULL,
  category_type      VARCHAR(16)  NOT NULL DEFAULT 'drink' CHECK (category_type = 'drink'),
  category_code      VARCHAR(64)  NOT NULL,
  price_cents        BIGINT       NOT NULL CHECK (price_cents        >= 0),
  member_price_cents BIGINT       NOT NULL CHECK (member_price_cents >= 0),
  stock              INT          NOT NULL DEFAULT 0 CHECK (stock        >= 0),
  stock_locked       INT          NOT NULL DEFAULT 0 CHECK (stock_locked >= 0 AND stock_locked <= stock),
  description        TEXT,
  thumb_url          TEXT,
  status             VARCHAR(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  is_new             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,
  CONSTRAINT fk_drinks_category FOREIGN KEY (category_type, category_code)
    REFERENCES categories(type, code)
);
CREATE INDEX idx_drinks_status_cat ON drinks(status, category_code);

CREATE TABLE flavor_tags (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(32)  NOT NULL,
  category      VARCHAR(32)  NOT NULL,
  ai_weight     NUMERIC(4,2) NOT NULL DEFAULT 0.50 CHECK (ai_weight BETWEEN 0 AND 1),
  score_map     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uniq_ft_name UNIQUE (name)
);

CREATE TABLE cigar_tags (
  cigar_id  BIGINT NOT NULL REFERENCES cigars(id)      ON DELETE CASCADE,
  tag_id    BIGINT NOT NULL REFERENCES flavor_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cigar_id, tag_id)
);
CREATE INDEX idx_cigar_tags_tag ON cigar_tags(tag_id);

CREATE TABLE pairings (
  id           BIGSERIAL PRIMARY KEY,
  cigar_id     BIGINT NOT NULL REFERENCES cigars(id) ON DELETE CASCADE,
  drink_id     BIGINT NOT NULL REFERENCES drinks(id) ON DELETE RESTRICT,
  description  TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_pair UNIQUE (cigar_id, drink_id)
);

CREATE TABLE reference_cigars (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(128) NOT NULL,
  brand         VARCHAR(64)  NOT NULL,
  category_code VARCHAR(64)  NOT NULL,
  strength      VARCHAR(32),
  flavor_start  TEXT,
  flavor_mid    TEXT,
  flavor_end    TEXT,
  remark        TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. 购物车
-- ============================================================================

CREATE TABLE cart_items (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_type   VARCHAR(8) NOT NULL CHECK (product_type IN ('cigar','drink')),
  product_id     BIGINT NOT NULL,
  spec           VARCHAR(32) NOT NULL DEFAULT '单支',
  qty            INT    NOT NULL CHECK (qty > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_cart UNIQUE (user_id, product_type, product_id, spec)
);
CREATE INDEX idx_cart_user ON cart_items(user_id);

-- ============================================================================
-- 5. 订单 / 支付 / 退款
-- ============================================================================

CREATE TABLE orders (
  id                      BIGSERIAL PRIMARY KEY,
  order_no                VARCHAR(32) NOT NULL,
  idempotency_key         VARCHAR(64) NOT NULL,                 -- v2 修订：持久化幂等键
  user_id                 BIGINT NOT NULL REFERENCES users(id),
  user_name_snapshot      VARCHAR(64) NOT NULL,
  total_cents             BIGINT NOT NULL CHECK (total_cents       >= 0),
  member_discount_cents   BIGINT NOT NULL DEFAULT 0,
  actual_pay_cents        BIGINT NOT NULL CHECK (actual_pay_cents  >= 0),
  refunded_amount_cents   BIGINT NOT NULL DEFAULT 0
    CHECK (refunded_amount_cents >= 0 AND refunded_amount_cents <= actual_pay_cents),
  pay_method              VARCHAR(16) CHECK (pay_method IN ('balance','meituan')),
  status                  VARCHAR(16) NOT NULL CHECK (status IN
    ('pending','paid','settling','completed','cancelled','refunding','refunded')),
  pickup_time             VARCHAR(64) DEFAULT '到店自提',
  remark                  TEXT,
  paid_at                 TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           VARCHAR(255),
  evaluated               BOOLEAN NOT NULL DEFAULT FALSE,
  meituan_order_no        VARCHAR(64),
  meituan_sync_status     VARCHAR(16) NOT NULL DEFAULT 'not_required'
    CHECK (meituan_sync_status IN ('not_required','not_synced','synced','failed_retry','out_of_sync')),
  meituan_retry_count     INT NOT NULL DEFAULT 0,
  meituan_next_retry_at   TIMESTAMPTZ,
  meituan_sync_at         TIMESTAMPTZ,
  expire_at               TIMESTAMPTZ NOT NULL,
  version                 INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_orders_no   UNIQUE (order_no),
  CONSTRAINT uniq_orders_idem UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_orders_user_created   ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_expire_pending ON orders(expire_at)        WHERE status='pending';
CREATE INDEX idx_orders_meituan_retry  ON orders(meituan_next_retry_at)
  WHERE meituan_sync_status='failed_retry';

CREATE TABLE order_items (
  id                       BIGSERIAL PRIMARY KEY,
  order_id                 BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type             VARCHAR(8) NOT NULL CHECK (product_type IN ('cigar','drink')),
  product_id               BIGINT NOT NULL,
  name_snapshot            VARCHAR(128) NOT NULL,
  spec_snapshot            VARCHAR(32)  NOT NULL,
  price_cents_snapshot     BIGINT NOT NULL,
  member_price_snapshot    BIGINT NOT NULL,
  qty                      INT    NOT NULL CHECK (qty > 0),
  -- v2 修订：行级实付（部分退款时按 SKU 退）
  actual_amount_cents      BIGINT NOT NULL CHECK (actual_amount_cents >= 0),
  thumb_url_snapshot       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oi_order ON order_items(order_id);

-- v2 修订：移除 'refunded' 状态值
CREATE TABLE payment_records (
  id                   BIGSERIAL PRIMARY KEY,
  payment_no           VARCHAR(40) NOT NULL,
  order_id             BIGINT NOT NULL REFERENCES orders(id),
  user_id              BIGINT NOT NULL,
  amount_cents         BIGINT NOT NULL CHECK (amount_cents > 0),
  channel              VARCHAR(16) NOT NULL CHECK (channel IN ('balance','wechat','meituan')),
  channel_trade_no     VARCHAR(64),
  status               VARCHAR(16) NOT NULL CHECK (status IN ('pending','success','failed','closed')),
  failed_reason        VARCHAR(255),
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_pay_no UNIQUE (payment_no)
);
CREATE UNIQUE INDEX uniq_pay_order_success
  ON payment_records(order_id) WHERE status='success';
CREATE INDEX idx_pay_channel_trade ON payment_records(channel, channel_trade_no);

-- v2 修订：增加 received_count 用于审计重放次数
CREATE TABLE payment_callbacks (
  id              BIGSERIAL PRIMARY KEY,
  channel         VARCHAR(16) NOT NULL,
  external_id     VARCHAR(64) NOT NULL,
  related_type    VARCHAR(16) NOT NULL CHECK (related_type IN ('order_pay','recharge','refund')),
  related_no      VARCHAR(40) NOT NULL,
  raw_payload     JSONB NOT NULL,                       -- 落库前脱敏
  signature       TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  process_result  VARCHAR(255),
  received_count  INT NOT NULL DEFAULT 1,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,
  CONSTRAINT uniq_cb UNIQUE (channel, external_id)
);
CREATE INDEX idx_pcb_related ON payment_callbacks(related_type, related_no);

CREATE TABLE refund_records (
  id                BIGSERIAL PRIMARY KEY,
  refund_no         VARCHAR(40) NOT NULL,
  idempotency_key   VARCHAR(64),
  order_id          BIGINT NOT NULL REFERENCES orders(id),
  user_id           BIGINT NOT NULL,
  amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
  channel           VARCHAR(16) NOT NULL CHECK (channel IN ('balance','wechat','meituan')),
  status            VARCHAR(16) NOT NULL CHECK (status IN ('pending','success','failed')),
  reason            VARCHAR(255),
  operator_admin_id BIGINT,
  channel_trade_no  VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_refund_no UNIQUE (refund_no)
);
CREATE INDEX idx_refund_order        ON refund_records(order_id);
CREATE INDEX idx_refund_pending      ON refund_records(order_id) WHERE status='pending';
CREATE UNIQUE INDEX uniq_refund_idem ON refund_records(order_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 6. 充值与资产流水
-- ============================================================================

CREATE TABLE recharge_tiers (
  id            BIGSERIAL PRIMARY KEY,
  amount_cents  BIGINT NOT NULL CHECK (amount_cents >= 1),       -- v2: 微信支付下限
  bonus_cents   BIGINT NOT NULL DEFAULT 0 CHECK (bonus_cents >= 0),
  display_name  VARCHAR(64),
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recharge_orders (
  id                BIGSERIAL PRIMARY KEY,
  recharge_no       VARCHAR(40) NOT NULL,
  idempotency_key   VARCHAR(64),
  user_id           BIGINT NOT NULL REFERENCES users(id),
  tier_id           BIGINT REFERENCES recharge_tiers(id),
  amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
  bonus_cents       BIGINT NOT NULL DEFAULT 0,
  total_cents       BIGINT NOT NULL,
  status            VARCHAR(16) NOT NULL CHECK (status IN ('pending','success','failed','closed')),
  channel           VARCHAR(16) NOT NULL DEFAULT 'wechat',
  channel_trade_no  VARCHAR(64),
  paid_at           TIMESTAMPTZ,
  expire_at         TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_recharge_no UNIQUE (recharge_no)
);
CREATE INDEX idx_recharge_user_created  ON recharge_orders(user_id, created_at DESC);
CREATE INDEX idx_recharge_pending       ON recharge_orders(created_at)
  WHERE status='pending';
CREATE UNIQUE INDEX uniq_recharge_idem  ON recharge_orders(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- v2 修订：加幂等唯一索引
CREATE TABLE balance_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id),
  type                VARCHAR(16) NOT NULL CHECK (type IN ('recharge','consume','refund','adjust')),
  direction           SMALLINT NOT NULL CHECK (direction IN (1,-1)),
  amount_cents        BIGINT NOT NULL CHECK (amount_cents > 0),
  balance_after_cents BIGINT NOT NULL,
  related_type        VARCHAR(32) NOT NULL,
  related_id          BIGINT,
  related_no          VARCHAR(40) NOT NULL,
  description         VARCHAR(255),
  operator_admin_id   BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bt_user_created ON balance_transactions(user_id, created_at DESC);
CREATE INDEX idx_bt_related      ON balance_transactions(related_type, related_id);
-- 关键：同一业务事件对同一用户、同一类型，只能产生一条流水
CREATE UNIQUE INDEX uniq_bt_event
  ON balance_transactions(user_id, related_type, related_no, type);

-- v2 修订：加幂等唯一索引
CREATE TABLE point_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id),
  level_type          VARCHAR(16) NOT NULL CHECK (level_type IN ('recharge','consumption')),
  type                VARCHAR(24) NOT NULL CHECK (type IN
    ('recharge_earn','consume_earn','consume_revoke','adjust')),
  direction           SMALLINT NOT NULL CHECK (direction IN (1,-1)),
  points              BIGINT NOT NULL CHECK (points > 0),
  points_after        BIGINT NOT NULL,
  related_type        VARCHAR(32) NOT NULL,
  related_id          BIGINT,
  related_no          VARCHAR(40) NOT NULL,
  description         VARCHAR(255),
  operator_admin_id   BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pt_user_lt_created ON point_transactions(user_id, level_type, created_at DESC);
CREATE UNIQUE INDEX uniq_pt_event
  ON point_transactions(user_id, level_type, related_type, related_no, type);

CREATE TABLE level_change_logs (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id),
  level_type        VARCHAR(16) NOT NULL CHECK (level_type IN ('recharge','consumption')),
  level_before      SMALLINT NOT NULL,
  level_after       SMALLINT NOT NULL,
  trigger_type      VARCHAR(32) NOT NULL CHECK (trigger_type IN
    ('recharge_upgrade','consume_upgrade','recalculate','admin_adjust','refund_downgrade')),
  related_no        VARCHAR(40),
  remark            VARCHAR(255),
  operator_admin_id BIGINT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lcl_user_created ON level_change_logs(user_id, created_at DESC);

-- v2 修订：EXCLUDE 防区间重叠
CREATE TABLE level_configs (
  id            BIGSERIAL PRIMARY KEY,
  level_type    VARCHAR(16) NOT NULL CHECK (level_type IN ('recharge','consumption')),
  level         SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 9),
  name          VARCHAR(64) NOT NULL,
  min_points    BIGINT NOT NULL CHECK (min_points >= 0),
  max_points    BIGINT,
  icon          VARCHAR(32) NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by    BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_lc UNIQUE (level_type, level),
  CONSTRAINT chk_lc_range CHECK (max_points IS NULL OR max_points >= min_points)
);
ALTER TABLE level_configs
  ADD CONSTRAINT no_overlap_levels EXCLUDE USING GIST (
    level_type WITH =,
    int8range(min_points, COALESCE(max_points, 9223372036854775807), '[]') WITH &&
  );

CREATE TABLE level_recalc_jobs (
  id              BIGSERIAL PRIMARY KEY,
  triggered_by    BIGINT,
  status          VARCHAR(16) NOT NULL CHECK (status IN ('pending','running','success','failed')),
  total_users     INT,
  affected_users  INT,
  detail          JSONB,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. 评价 / 海报 / 品鉴
-- ============================================================================

-- v2 修订：order_id NOT NULL（评价必须基于真实订单）
CREATE TABLE reviews (
  id                       BIGSERIAL PRIMARY KEY,
  user_id                  BIGINT NOT NULL REFERENCES users(id),
  cigar_id                 BIGINT NOT NULL REFERENCES cigars(id),
  order_id                 BIGINT NOT NULL REFERENCES orders(id),
  rating                   SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content                  TEXT NOT NULL,
  status                   VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','visible','hidden')),
  recharge_level_snap      SMALLINT NOT NULL,
  consumption_level_snap   SMALLINT NOT NULL,
  reviewed_by_admin_id     BIGINT,
  reviewed_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ,
  CONSTRAINT uniq_review_per_order_cigar UNIQUE (order_id, cigar_id)
);
CREATE INDEX idx_reviews_cigar_status ON reviews(cigar_id, status, created_at DESC);

-- 触发器：维护 cigars.rating_avg/rating_count
CREATE OR REPLACE FUNCTION trg_update_cigar_rating() RETURNS TRIGGER AS $$
DECLARE
  v_cigar_id BIGINT;
BEGIN
  v_cigar_id := COALESCE(NEW.cigar_id, OLD.cigar_id);
  UPDATE cigars c
     SET rating_avg = COALESCE(
           (SELECT ROUND(AVG(rating)::numeric, 2)
              FROM reviews
             WHERE cigar_id = v_cigar_id AND status='visible' AND deleted_at IS NULL), 0),
         rating_count = (SELECT COUNT(*)
              FROM reviews
             WHERE cigar_id = v_cigar_id AND status='visible' AND deleted_at IS NULL),
         updated_at = now()
   WHERE c.id = v_cigar_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_rating_sync
AFTER INSERT OR UPDATE OF status, deleted_at OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION trg_update_cigar_rating();

CREATE TABLE sensitive_words (
  id          BIGSERIAL PRIMARY KEY,
  word        VARCHAR(64) NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_sw UNIQUE (word)
);

CREATE TABLE posters (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id),
  cigar_id          BIGINT REFERENCES cigars(id),
  voice_text        TEXT,
  flavor_tags       TEXT[] NOT NULL DEFAULT '{}',
  flavor_scores     JSONB,
  poster_image_url  TEXT,
  template_snapshot JSONB,
  status            VARCHAR(16) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','deleted')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posters_user ON posters(user_id, created_at DESC);

-- v2 修订：单例表用 SMALLINT PK CHECK(id=1)（修语法 bug）
CREATE TABLE poster_templates (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo_url      TEXT,
  bg_color      VARCHAR(16) NOT NULL DEFAULT '#0D0D0D',
  accent_color  VARCHAR(16) NOT NULL DEFAULT '#C9A84C',
  font_style    VARCHAR(32) NOT NULL DEFAULT 'serif',
  club_name     VARCHAR(64),
  tagline       VARCHAR(128),
  updated_by    BIGINT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasting_records (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  cigar_id      BIGINT REFERENCES cigars(id),
  flavor_tags   TEXT[] NOT NULL DEFAULT '{}',
  flavor_scores JSONB  NOT NULL DEFAULT '{}'::jsonb,
  source        VARCHAR(16) NOT NULL CHECK (source IN ('flavor_page','voice_poster','order_review')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasting_user ON tasting_records(user_id, created_at DESC);

-- ============================================================================
-- 8. AI 推荐
-- ============================================================================

CREATE TABLE recommend_questions (
  id          BIGSERIAL PRIMARY KEY,
  position    INT NOT NULL,
  title       VARCHAR(128) NOT NULL,
  multi       BOOLEAN NOT NULL DEFAULT FALSE,
  options     JSONB  NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recommend_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT REFERENCES users(id),
  answers         JSONB NOT NULL,
  result_cigars   JSONB NOT NULL,
  cost_ms         INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rl_user_created ON recommend_logs(user_id, created_at DESC);

-- ============================================================================
-- 9. 运营
-- ============================================================================

CREATE TABLE banners (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(128),
  image_url   TEXT NOT NULL,
  link_type   VARCHAR(16) CHECK (link_type IN ('none','cigar','activity','external')),
  link_target VARCHAR(255),
  position    VARCHAR(32) NOT NULL DEFAULT 'club',
  sort_order  INT NOT NULL DEFAULT 0,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activities (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(128) NOT NULL,
  cover_url   TEXT,
  description TEXT,
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. 系统
-- ============================================================================

CREATE TABLE system_configs (
  config_key    VARCHAR(64) PRIMARY KEY,
  config_value  JSONB NOT NULL,
  description   TEXT,
  updated_by    BIGINT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE meituan_sync_logs (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT,
  request_type  VARCHAR(16) NOT NULL CHECK (request_type IN ('push_order','pull_status','test')),
  request_body  JSONB,
  response_body JSONB,
  http_status   INT,
  success       BOOLEAN,
  error         TEXT,
  triggered_by  VARCHAR(32),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msl_order_created ON meituan_sync_logs(order_id, created_at DESC);

-- v2 修订：一期就建对账表（不是二期）
CREATE TABLE reconciliation_reports (
  id                      BIGSERIAL PRIMARY KEY,
  channel                 VARCHAR(16) NOT NULL CHECK (channel IN ('wechat','meituan')),
  date                    DATE NOT NULL,
  our_count               INT  NOT NULL DEFAULT 0,
  our_amount_cents        BIGINT NOT NULL DEFAULT 0,
  platform_count          INT  NOT NULL DEFAULT 0,
  platform_amount_cents   BIGINT NOT NULL DEFAULT 0,
  diff_count              INT  NOT NULL DEFAULT 0,
  diff_amount_cents       BIGINT NOT NULL DEFAULT 0,
  status                  VARCHAR(16) NOT NULL CHECK (status IN
    ('balanced','diff_found','manual_review','resolved')),
  diff_detail             JSONB,
  resolved_by_admin_id    BIGINT,
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_recon UNIQUE (channel, date)
);
CREATE INDEX idx_recon_status ON reconciliation_reports(status, date DESC);

-- ============================================================================
-- 11. 二期占位（结构先建好但 MVP 不开放接口）
-- ============================================================================

CREATE TABLE favorites (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cigar_id   BIGINT NOT NULL REFERENCES cigars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cigar_id)
);

CREATE TABLE coupons (
  id              BIGSERIAL PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  name            VARCHAR(128) NOT NULL,
  type            VARCHAR(16) NOT NULL,
  value_cents     BIGINT,
  threshold_cents BIGINT,
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_coupons (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  coupon_id   BIGINT NOT NULL,
  status      VARCHAR(16) NOT NULL CHECK (status IN ('unused','used','expired')),
  used_at     TIMESTAMPTZ,
  used_order  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  reserve_at    TIMESTAMPTZ NOT NULL,
  party_size    INT,
  remark        TEXT,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. SEED 数据（必须）
-- ============================================================================

-- 角色（4 条）
INSERT INTO roles(code,name,description) VALUES
 ('super',  '超级管理员','拥有全部权限，不可删除'),
 ('product','商品管理员','商品/雪茄库管理'),
 ('order',  '订单管理员','订单管理'),
 ('member', '会员管理员','会员/储值管理');

-- 权限（25 条）
INSERT INTO permissions(code,name,module) VALUES
 ('dashboard:read','数据概览-读','dashboard'),
 ('product:read','商品-读','product'),
 ('product:write','商品-写','product'),
 ('product:delete','商品-删','product'),
 ('library:read','雪茄库-读','library'),
 ('library:write','雪茄库-写','library'),
 ('library:sync','雪茄库-同步','library'),
 ('tag:read','标签-读','tag'),
 ('tag:write','标签-写','tag'),
 ('order:read','订单-读','order'),
 ('order:write','订单-写','order'),
 ('order:refund','订单-退款','order'),
 ('order:export','订单-导出','order'),
 ('member:read','会员-读','member'),
 ('storedvalue:read','储值-读','storedvalue'),
 ('storedvalue:adjust','储值-调整','storedvalue'),
 ('storedvalue:level-config','等级配置','storedvalue'),
 ('review:read','评价-读','review'),
 ('review:moderate','评价-审核','review'),
 ('review:delete','评价-删除','review'),
 ('poster:read','海报-读','poster'),
 ('poster:template','海报模板','poster'),
 ('account:read','账号-读','account'),
 ('account:write','账号-写','account'),
 ('settings:read','设置-读','settings'),
 ('settings:write','设置-写','settings'),
 ('statistics:read','统计-读','statistics');

-- 角色-权限（按 Plan.md §6.3 矩阵）
INSERT INTO role_permissions(role_code, permission_code) VALUES
 -- super 全部
 ('super','dashboard:read'),('super','product:read'),('super','product:write'),('super','product:delete'),
 ('super','library:read'),('super','library:write'),('super','library:sync'),
 ('super','tag:read'),('super','tag:write'),
 ('super','order:read'),('super','order:write'),('super','order:refund'),('super','order:export'),
 ('super','member:read'),('super','storedvalue:read'),('super','storedvalue:adjust'),('super','storedvalue:level-config'),
 ('super','review:read'),('super','review:moderate'),('super','review:delete'),
 ('super','poster:read'),('super','poster:template'),
 ('super','account:read'),('super','account:write'),
 ('super','settings:read'),('super','settings:write'),
 ('super','statistics:read'),
 -- product
 ('product','dashboard:read'),('product','product:read'),('product','product:write'),('product','product:delete'),
 ('product','library:read'),('product','library:write'),('product','library:sync'),
 ('product','tag:read'),('product','tag:write'),
 ('product','review:read'),('product','review:moderate'),('product','review:delete'),
 ('product','poster:read'),
 ('product','settings:read'),
 -- order
 ('order','dashboard:read'),
 ('order','order:read'),('order','order:write'),('order','order:refund'),('order','order:export'),
 ('order','settings:read'),('order','statistics:read'),
 -- member
 ('member','dashboard:read'),
 ('member','member:read'),
 ('member','storedvalue:read'),('member','storedvalue:adjust'),
 ('member','settings:read'),('member','statistics:read');

-- 超级管理员（密码 admin123 的 bcrypt cost 12 哈希；must_change_password=TRUE 强制首登改密）
-- 提示：上线前必须用真实生成的 hash 替换；这里是开发用占位
INSERT INTO admins(username, name, password_hash, role_code, status, must_change_password)
VALUES ('admin', '超级管理员',
        '$2b$12$LQKvZ0qx5xNzCB.jGvJMmuLqj6zZJq8Wls6rKxR9Dts5vJUkuYfFu',  -- admin123
        'super', 1, TRUE);

-- 雪茄分类（5 条）
INSERT INTO categories(type, code, name, sort_order) VALUES
 ('cigar','luxury','奢华系列',1),
 ('cigar','classic','经典系列',2),
 ('cigar','strong','浓郁系列',3),
 ('cigar','mild','轻柔系列',4),
 ('cigar','limited','限量系列',5);

-- 饮品分类（6 条）
INSERT INTO categories(type, code, name, sort_order) VALUES
 ('drink','whisky','威士忌',1),
 ('drink','brandy','白兰地',2),
 ('drink','rum','朗姆酒',3),
 ('drink','wine','葡萄酒',4),
 ('drink','tea','茶饮',5),
 ('drink','coffee','咖啡',6);

-- 风味标签（12 条）
INSERT INTO flavor_tags(name, category, ai_weight, score_map) VALUES
 ('果香','果香',0.8,'{"果香":80}'),
 ('木香','木香',0.8,'{"木香":80}'),
 ('烟草','烟草',0.9,'{"烟草":90}'),
 ('辛辣','辛辣',0.7,'{"辛辣":75}'),
 ('土壤','土壤',0.6,'{"土壤":70}'),
 ('甜感','甜感',0.7,'{"甜感":75}'),
 ('烘焙','烘焙',0.6,'{"烘焙":70}'),
 ('皮革','木香',0.7,'{"木香":75,"烟草":40}'),
 ('坚果','果香',0.6,'{"果香":40,"烘焙":70}'),
 ('咖啡','烘焙',0.7,'{"烘焙":80}'),
 ('巧克力','甜感',0.6,'{"甜感":75,"烘焙":40}'),
 ('花香','果香',0.5,'{"果香":60}');

-- 等级配置（充值 9 + 消费 9 共 18 行）
INSERT INTO level_configs(level_type,level,name,min_points,max_points,icon,enabled) VALUES
 ('recharge',1,'V1',0,999,'vip',TRUE),
 ('recharge',2,'V2',1000,1999,'vip',TRUE),
 ('recharge',3,'V3',2000,2999,'vip',TRUE),
 ('recharge',4,'V4',3000,3999,'vip',TRUE),
 ('recharge',5,'V5',4000,4999,'vip',TRUE),
 ('recharge',6,'V6',5000,5999,'vip',TRUE),
 ('recharge',7,'V7',6000,6999,'vip',TRUE),
 ('recharge',8,'V8',7000,7999,'vip',TRUE),
 ('recharge',9,'V9',8000,NULL,'vip',TRUE),
 ('consumption',1,'V1',0,999,'cigar',TRUE),
 ('consumption',2,'V2',1000,1999,'cigar',TRUE),
 ('consumption',3,'V3',2000,2999,'cigar',TRUE),
 ('consumption',4,'V4',3000,3999,'cigar',TRUE),
 ('consumption',5,'V5',4000,4999,'cigar',TRUE),
 ('consumption',6,'V6',5000,5999,'cigar',TRUE),
 ('consumption',7,'V7',6000,6999,'cigar',TRUE),
 ('consumption',8,'V8',7000,7999,'cigar',TRUE),
 ('consumption',9,'V9',8000,NULL,'cigar',TRUE);

-- 充值档位（5 档）
INSERT INTO recharge_tiers(amount_cents, bonus_cents, display_name, sort_order) VALUES
 (50000,   0,    '500 元',1),
 (100000,  10000,'1000 元 送 100',2),
 (200000,  30000,'2000 元 送 300',3),
 (300000,  50000,'3000 元 送 500',4),
 (500000,  100000,'5000 元 送 1000',5);

-- 推荐问题（5 题，简化版，正式题面参考前端文档）
INSERT INTO recommend_questions(position,title,multi,options,enabled) VALUES
 (1,'你的雪茄经验如何？',FALSE,
   '[{"label":"新手","score_delta":{"轻柔":3,"甜感":2}},{"label":"有过几次","score_delta":{"果香":2,"甜感":2}},{"label":"老饕","score_delta":{"烟草":3,"木香":2,"辛辣":2}}]'::jsonb,TRUE),
 (2,'今天的心情？',FALSE,
   '[{"label":"放松","score_delta":{"甜感":2,"果香":2}},{"label":"专注","score_delta":{"木香":2,"烘焙":2}},{"label":"庆祝","score_delta":{"果香":3,"花香":2}}]'::jsonb,TRUE),
 (3,'你喜欢的风味？（多选）',TRUE,
   '[{"label":"果香","score_delta":{"果香":3}},{"label":"木香","score_delta":{"木香":3}},{"label":"烟草","score_delta":{"烟草":3}},{"label":"辛辣","score_delta":{"辛辣":3}},{"label":"甜感","score_delta":{"甜感":3}},{"label":"烘焙","score_delta":{"烘焙":3}}]'::jsonb,TRUE),
 (4,'打算抽多久？',FALSE,
   '[{"label":"30 分钟内","score_delta":{}},{"label":"30-60 分钟","score_delta":{}},{"label":"1 小时以上","score_delta":{"烟草":2,"木香":2}}]'::jsonb,TRUE),
 (5,'搭配什么？',FALSE,
   '[{"label":"威士忌","score_delta":{"烟草":2,"烘焙":2}},{"label":"咖啡","score_delta":{"烘焙":3}},{"label":"什么都不要","score_delta":{}}]'::jsonb,TRUE);

-- 系统配置默认值
INSERT INTO system_configs(config_key,config_value,description) VALUES
 ('stored_value.discount_rate','0.9','会员储值折扣率'),
 ('stored_value.birthday_remind_days','3','生日提前提醒天数'),
 ('push.new_cigar_enabled','true','新品上架推送总开关'),
 ('shop.name','"GOAT CIGAR CLUB"','门店名称'),
 ('shop.tagline','"山羊雪茄俱乐部"','门店标语'),
 ('shop.business_hours','"17:00 - 02:00"','营业时间'),
 ('shop.address','"待填写"','门店地址'),
 ('shop.phone','"待填写"','门店电话'),
 ('order.expire_minutes','30','订单超时关闭分钟数'),
 ('review.auto_audit','false','评论是否全部需审核'),
 ('meituan.auto_sync','false','美团订单自动推送开关');

-- 海报模板单例
INSERT INTO poster_templates(id, club_name, tagline) VALUES (1, 'GOAT CIGAR CLUB', '山羊雪茄俱乐部');

-- ============================================================================
-- 完成
-- ============================================================================
-- 验证：
--   SELECT COUNT(*) FROM permissions;       -- 应 = 27（实际比文档多 2 条 settings:read 与 statistics:read 已合并到上方）
--   SELECT COUNT(*) FROM role_permissions;
--   SELECT COUNT(*) FROM categories;        -- 应 = 11 (5+6)
--   SELECT COUNT(*) FROM flavor_tags;       -- 应 = 12
--   SELECT COUNT(*) FROM level_configs;     -- 应 = 18
--   SELECT COUNT(*) FROM recharge_tiers;    -- 应 = 5
--   SELECT COUNT(*) FROM recommend_questions; -- 应 = 5
