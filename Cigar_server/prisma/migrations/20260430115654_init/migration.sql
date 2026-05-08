-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "openid" VARCHAR(64) NOT NULL,
    "unionid" VARCHAR(64),
    "nickname" VARCHAR(64) NOT NULL DEFAULT '微信用户',
    "avatar_url" TEXT,
    "phone_encrypted" BYTEA,
    "phone_mask" VARCHAR(20),
    "birthday" DATE,
    "gender" SMALLINT NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "user_id" BIGINT NOT NULL,
    "balance_cents" BIGINT NOT NULL DEFAULT 0,
    "recharge_level" SMALLINT NOT NULL DEFAULT 1,
    "consumption_level" SMALLINT NOT NULL DEFAULT 1,
    "recharge_points" BIGINT NOT NULL DEFAULT 0,
    "consumption_points" BIGINT NOT NULL DEFAULT 0,
    "total_recharge_cents" BIGINT NOT NULL DEFAULT 0,
    "total_spend_cents" BIGINT NOT NULL DEFAULT 0,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role_code" VARCHAR(32) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "permissions" (
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "module" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_code" VARCHAR(32) NOT NULL,
    "permission_code" VARCHAR(64) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_code","permission_code")
);

-- CreateTable
CREATE TABLE "admin_login_logs" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" BIGINT,
    "username" VARCHAR(64) NOT NULL,
    "result" VARCHAR(16) NOT NULL,
    "reason" VARCHAR(64),
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" BIGINT NOT NULL,
    "admin_name" VARCHAR(64) NOT NULL,
    "module" VARCHAR(32) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32),
    "target_id" VARCHAR(64),
    "description" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "level" VARCHAR(16) NOT NULL DEFAULT 'info',
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "type" VARCHAR(16) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("type","code")
);

-- CreateTable
CREATE TABLE "cigars" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "brand" VARCHAR(64) NOT NULL,
    "model" VARCHAR(64),
    "spec" VARCHAR(32) NOT NULL DEFAULT '单支',
    "category_type" VARCHAR(16) NOT NULL DEFAULT 'cigar',
    "category_code" VARCHAR(64) NOT NULL,
    "origin" VARCHAR(64),
    "year" VARCHAR(16),
    "wrapper" VARCHAR(64),
    "strength" VARCHAR(32),
    "duration" VARCHAR(32),
    "price_cents" BIGINT NOT NULL,
    "member_price_cents" BIGINT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_locked" INTEGER NOT NULL DEFAULT 0,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "flavor_start" TEXT,
    "flavor_mid" TEXT,
    "flavor_end" TEXT,
    "flavor_scores" JSONB NOT NULL DEFAULT '{}',
    "scenes" TEXT[],
    "segments" JSONB NOT NULL DEFAULT '[]',
    "ai_flavor_analysis" JSONB,
    "hero_image_url" TEXT,
    "thumb_url" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "cigars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drinks" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "category_type" VARCHAR(16) NOT NULL DEFAULT 'drink',
    "category_code" VARCHAR(64) NOT NULL,
    "price_cents" BIGINT NOT NULL,
    "member_price_cents" BIGINT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_locked" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "thumb_url" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "drinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flavor_tags" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "ai_weight" DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    "score_map" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "flavor_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cigar_tags" (
    "cigar_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,

    CONSTRAINT "cigar_tags_pkey" PRIMARY KEY ("cigar_id","tag_id")
);

-- CreateTable
CREATE TABLE "pairings" (
    "id" BIGSERIAL NOT NULL,
    "cigar_id" BIGINT NOT NULL,
    "drink_id" BIGINT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_cigars" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "brand" VARCHAR(64) NOT NULL,
    "category_code" VARCHAR(64) NOT NULL,
    "strength" VARCHAR(32),
    "flavor_start" TEXT,
    "flavor_mid" TEXT,
    "flavor_end" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reference_cigars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "product_type" VARCHAR(8) NOT NULL,
    "product_id" BIGINT NOT NULL,
    "spec" VARCHAR(32) NOT NULL DEFAULT '单支',
    "qty" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "idempotency_key" VARCHAR(64) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "user_name_snapshot" VARCHAR(64) NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "member_discount_cents" BIGINT NOT NULL DEFAULT 0,
    "actual_pay_cents" BIGINT NOT NULL,
    "refunded_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "pay_method" VARCHAR(16),
    "status" VARCHAR(16) NOT NULL,
    "pickup_time" VARCHAR(64) DEFAULT '到店自提',
    "remark" TEXT,
    "paid_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" VARCHAR(255),
    "evaluated" BOOLEAN NOT NULL DEFAULT false,
    "meituan_order_no" VARCHAR(64),
    "meituan_sync_status" VARCHAR(16) NOT NULL DEFAULT 'not_required',
    "meituan_retry_count" INTEGER NOT NULL DEFAULT 0,
    "meituan_next_retry_at" TIMESTAMPTZ,
    "meituan_sync_at" TIMESTAMPTZ,
    "expire_at" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "product_type" VARCHAR(8) NOT NULL,
    "product_id" BIGINT NOT NULL,
    "name_snapshot" VARCHAR(128) NOT NULL,
    "spec_snapshot" VARCHAR(32) NOT NULL,
    "price_cents_snapshot" BIGINT NOT NULL,
    "member_price_snapshot" BIGINT NOT NULL,
    "qty" INTEGER NOT NULL,
    "actual_amount_cents" BIGINT NOT NULL,
    "thumb_url_snapshot" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" BIGSERIAL NOT NULL,
    "payment_no" VARCHAR(40) NOT NULL,
    "order_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "channel_trade_no" VARCHAR(64),
    "status" VARCHAR(16) NOT NULL,
    "failed_reason" VARCHAR(255),
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_callbacks" (
    "id" BIGSERIAL NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "external_id" VARCHAR(64) NOT NULL,
    "related_type" VARCHAR(16) NOT NULL,
    "related_no" VARCHAR(40) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "process_result" VARCHAR(255),
    "received_count" INTEGER NOT NULL DEFAULT 1,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "payment_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_records" (
    "id" BIGSERIAL NOT NULL,
    "refund_no" VARCHAR(40) NOT NULL,
    "idempotency_key" VARCHAR(64),
    "order_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "reason" VARCHAR(255),
    "operator_admin_id" BIGINT,
    "channel_trade_no" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "refund_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_tiers" (
    "id" BIGSERIAL NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "bonus_cents" BIGINT NOT NULL DEFAULT 0,
    "display_name" VARCHAR(64),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recharge_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_orders" (
    "id" BIGSERIAL NOT NULL,
    "recharge_no" VARCHAR(40) NOT NULL,
    "idempotency_key" VARCHAR(64),
    "user_id" BIGINT NOT NULL,
    "tier_id" BIGINT,
    "amount_cents" BIGINT NOT NULL,
    "bonus_cents" BIGINT NOT NULL DEFAULT 0,
    "total_cents" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "channel" VARCHAR(16) NOT NULL DEFAULT 'wechat',
    "channel_trade_no" VARCHAR(64),
    "paid_at" TIMESTAMPTZ,
    "expire_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recharge_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_transactions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "direction" SMALLINT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "balance_after_cents" BIGINT NOT NULL,
    "related_type" VARCHAR(32) NOT NULL,
    "related_id" BIGINT,
    "related_no" VARCHAR(40) NOT NULL,
    "description" VARCHAR(255),
    "operator_admin_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "level_type" VARCHAR(16) NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "direction" SMALLINT NOT NULL,
    "points" BIGINT NOT NULL,
    "points_after" BIGINT NOT NULL,
    "related_type" VARCHAR(32) NOT NULL,
    "related_id" BIGINT,
    "related_no" VARCHAR(40) NOT NULL,
    "description" VARCHAR(255),
    "operator_admin_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_change_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "level_type" VARCHAR(16) NOT NULL,
    "level_before" SMALLINT NOT NULL,
    "level_after" SMALLINT NOT NULL,
    "trigger_type" VARCHAR(32) NOT NULL,
    "related_no" VARCHAR(40),
    "remark" VARCHAR(255),
    "operator_admin_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_configs" (
    "id" BIGSERIAL NOT NULL,
    "level_type" VARCHAR(16) NOT NULL,
    "level" SMALLINT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "min_points" BIGINT NOT NULL,
    "max_points" BIGINT,
    "icon" VARCHAR(32) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_recalc_jobs" (
    "id" BIGSERIAL NOT NULL,
    "triggered_by" BIGINT,
    "status" VARCHAR(16) NOT NULL,
    "total_users" INTEGER,
    "affected_users" INTEGER,
    "detail" JSONB,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_recalc_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cigar_id" BIGINT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "recharge_level_snap" SMALLINT NOT NULL,
    "consumption_level_snap" SMALLINT NOT NULL,
    "reviewed_by_admin_id" BIGINT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensitive_words" (
    "id" BIGSERIAL NOT NULL,
    "word" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensitive_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posters" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cigar_id" BIGINT,
    "voice_text" TEXT,
    "flavor_tags" TEXT[],
    "flavor_scores" JSONB,
    "poster_image_url" TEXT,
    "template_snapshot" JSONB,
    "status" VARCHAR(16) NOT NULL DEFAULT 'generated',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_templates" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "logo_url" TEXT,
    "bg_color" VARCHAR(16) NOT NULL DEFAULT '#0D0D0D',
    "accent_color" VARCHAR(16) NOT NULL DEFAULT '#C9A84C',
    "font_style" VARCHAR(32) NOT NULL DEFAULT 'serif',
    "club_name" VARCHAR(64),
    "tagline" VARCHAR(128),
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poster_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasting_records" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cigar_id" BIGINT,
    "flavor_tags" TEXT[],
    "flavor_scores" JSONB NOT NULL DEFAULT '{}',
    "source" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasting_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommend_questions" (
    "id" BIGSERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "multi" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recommend_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommend_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "answers" JSONB NOT NULL,
    "result_cigars" JSONB NOT NULL,
    "cost_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommend_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(128),
    "image_url" TEXT NOT NULL,
    "link_type" VARCHAR(16),
    "link_target" VARCHAR(255),
    "position" VARCHAR(32) NOT NULL DEFAULT 'club',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMPTZ,
    "end_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "cover_url" TEXT,
    "description" TEXT,
    "start_at" TIMESTAMPTZ,
    "end_at" TIMESTAMPTZ,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "config_key" VARCHAR(64) NOT NULL,
    "config_value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("config_key")
);

-- CreateTable
CREATE TABLE "meituan_sync_logs" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT,
    "request_type" VARCHAR(16) NOT NULL,
    "request_body" JSONB,
    "response_body" JSONB,
    "http_status" INTEGER,
    "success" BOOLEAN,
    "error" TEXT,
    "triggered_by" VARCHAR(32),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meituan_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_reports" (
    "id" BIGSERIAL NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "date" DATE NOT NULL,
    "our_count" INTEGER NOT NULL DEFAULT 0,
    "our_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "platform_count" INTEGER NOT NULL DEFAULT 0,
    "platform_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "diff_count" INTEGER NOT NULL DEFAULT 0,
    "diff_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL,
    "diff_detail" JSONB,
    "resolved_by_admin_id" BIGINT,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");

-- CreateIndex
CREATE INDEX "idx_users_unionid" ON "users"("unionid");

-- CreateIndex
CREATE INDEX "idx_users_phone_mask" ON "users"("phone_mask");

-- CreateIndex
CREATE INDEX "idx_mp_recharge_level" ON "member_profiles"("recharge_level");

-- CreateIndex
CREATE INDEX "idx_mp_consumption_level" ON "member_profiles"("consumption_level");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "idx_all_username_created" ON "admin_login_logs"("username", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_oplogs_admin_created" ON "operation_logs"("admin_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_oplogs_module_action" ON "operation_logs"("module", "action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_oplogs_created" ON "operation_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_cigars_status_cat" ON "cigars"("status", "category_code");

-- CreateIndex
CREATE INDEX "idx_cigars_brand" ON "cigars"("brand");

-- CreateIndex
CREATE INDEX "idx_drinks_status_cat" ON "drinks"("status", "category_code");

-- CreateIndex
CREATE UNIQUE INDEX "flavor_tags_name_key" ON "flavor_tags"("name");

-- CreateIndex
CREATE INDEX "idx_cigar_tags_tag" ON "cigar_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_pair" ON "pairings"("cigar_id", "drink_id");

-- CreateIndex
CREATE INDEX "idx_cart_user" ON "cart_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_cart" ON "cart_items"("user_id", "product_type", "product_id", "spec");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "idx_orders_user_created" ON "orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_orders_idem" ON "orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_oi_order" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_payment_no_key" ON "payment_records"("payment_no");

-- CreateIndex
CREATE INDEX "idx_pay_channel_trade" ON "payment_records"("channel", "channel_trade_no");

-- CreateIndex
CREATE INDEX "idx_pcb_related" ON "payment_callbacks"("related_type", "related_no");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_cb" ON "payment_callbacks"("channel", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_records_refund_no_key" ON "refund_records"("refund_no");

-- CreateIndex
CREATE INDEX "idx_refund_order" ON "refund_records"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_orders_recharge_no_key" ON "recharge_orders"("recharge_no");

-- CreateIndex
CREATE INDEX "idx_recharge_user_created" ON "recharge_orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_bt_user_created" ON "balance_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_bt_related" ON "balance_transactions"("related_type", "related_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_bt_event" ON "balance_transactions"("user_id", "related_type", "related_no", "type");

-- CreateIndex
CREATE INDEX "idx_pt_user_lt_created" ON "point_transactions"("user_id", "level_type", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_pt_event" ON "point_transactions"("user_id", "level_type", "related_type", "related_no", "type");

-- CreateIndex
CREATE INDEX "idx_lcl_user_created" ON "level_change_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_lc" ON "level_configs"("level_type", "level");

-- CreateIndex
CREATE INDEX "idx_reviews_cigar_status" ON "reviews"("cigar_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_review_per_order_cigar" ON "reviews"("order_id", "cigar_id");

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_words_word_key" ON "sensitive_words"("word");

-- CreateIndex
CREATE INDEX "idx_posters_user" ON "posters"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_tasting_user" ON "tasting_records"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_rl_user_created" ON "recommend_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_msl_order_created" ON "meituan_sync_logs"("order_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_recon_status" ON "reconciliation_reports"("status", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_recon" ON "reconciliation_reports"("channel", "date");

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "roles"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cigars" ADD CONSTRAINT "cigars_category_type_category_code_fkey" FOREIGN KEY ("category_type", "category_code") REFERENCES "categories"("type", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_category_type_category_code_fkey" FOREIGN KEY ("category_type", "category_code") REFERENCES "categories"("type", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cigar_tags" ADD CONSTRAINT "cigar_tags_cigar_id_fkey" FOREIGN KEY ("cigar_id") REFERENCES "cigars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cigar_tags" ADD CONSTRAINT "cigar_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "flavor_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairings" ADD CONSTRAINT "pairings_cigar_id_fkey" FOREIGN KEY ("cigar_id") REFERENCES "cigars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairings" ADD CONSTRAINT "pairings_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_records" ADD CONSTRAINT "refund_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "recharge_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_change_logs" ADD CONSTRAINT "level_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_cigar_id_fkey" FOREIGN KEY ("cigar_id") REFERENCES "cigars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posters" ADD CONSTRAINT "posters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posters" ADD CONSTRAINT "posters_cigar_id_fkey" FOREIGN KEY ("cigar_id") REFERENCES "cigars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_records" ADD CONSTRAINT "tasting_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_records" ADD CONSTRAINT "tasting_records_cigar_id_fkey" FOREIGN KEY ("cigar_id") REFERENCES "cigars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommend_logs" ADD CONSTRAINT "recommend_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
