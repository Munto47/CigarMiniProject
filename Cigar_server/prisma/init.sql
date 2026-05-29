-- ============================================================
-- CigarPro 生产环境初始化种子数据 v1.0
-- 完全幂等：可安全重复执行（ON CONFLICT DO NOTHING）
-- 由 entrypoint.sh 在每次启动时自动执行
-- ============================================================

-- ── 1. 角色 ─────────────────────────────────────────────────
INSERT INTO roles (code, name, description) VALUES
  ('super',   '超级管理员', '拥有全部权限，不可删除'),
  ('product', '商品管理员', '商品/雪茄库/标签管理'),
  ('order',   '订单管理员', '订单/统计管理'),
  ('member',  '会员管理员', '会员/储值管理')
ON CONFLICT (code) DO NOTHING;

-- ── 2. 权限 ─────────────────────────────────────────────────
INSERT INTO permissions (code, name, module) VALUES
  ('dashboard:read',           '数据概览',   'dashboard'),
  ('product:read',             '商品查看',   'product'),
  ('product:write',            '商品编辑',   'product'),
  ('product:delete',           '商品删除',   'product'),
  ('library:read',             '雪茄库查看', 'library'),
  ('library:write',            '雪茄库编辑', 'library'),
  ('library:sync',             '雪茄库同步', 'library'),
  ('tag:read',                 '标签查看',   'tag'),
  ('tag:write',                '标签编辑',   'tag'),
  ('order:read',               '订单查看',   'order'),
  ('order:write',              '订单处理',   'order'),
  ('order:refund',             '订单退款',   'order'),
  ('order:export',             '订单导出',   'order'),
  ('member:read',              '会员查看',   'member'),
  ('storedvalue:read',         '储值查看',   'storedvalue'),
  ('storedvalue:adjust',       '余额调整',   'storedvalue'),
  ('storedvalue:level-config', '等级配置',   'storedvalue'),
  ('review:read',              '评价查看',   'review'),
  ('review:moderate',          '评价审核',   'review'),
  ('review:delete',            '评价删除',   'review'),
  ('poster:read',              '海报查看',   'poster'),
  ('poster:template',          '海报模板',   'poster'),
  ('account:read',             '账号查看',   'account'),
  ('account:write',            '账号管理',   'account'),
  ('settings:read',            '设置查看',   'settings'),
  ('settings:write',           '设置编辑',   'settings'),
  ('statistics:read',          '数据统计',   'statistics')
ON CONFLICT (code) DO NOTHING;

-- ── 3. 角色权限关联 ──────────────────────────────────────────
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('super','dashboard:read'),('super','product:read'),('super','product:write'),('super','product:delete'),
  ('super','library:read'),('super','library:write'),('super','library:sync'),
  ('super','tag:read'),('super','tag:write'),
  ('super','order:read'),('super','order:write'),('super','order:refund'),('super','order:export'),
  ('super','member:read'),('super','storedvalue:read'),('super','storedvalue:adjust'),('super','storedvalue:level-config'),
  ('super','review:read'),('super','review:moderate'),('super','review:delete'),
  ('super','poster:read'),('super','poster:template'),
  ('super','account:read'),('super','account:write'),
  ('super','settings:read'),('super','settings:write'),('super','statistics:read'),
  ('product','dashboard:read'),('product','product:read'),('product','product:write'),('product','product:delete'),
  ('product','library:read'),('product','library:write'),('product','library:sync'),
  ('product','tag:read'),('product','tag:write'),
  ('product','review:read'),('product','review:moderate'),('product','review:delete'),
  ('product','poster:read'),('product','settings:read'),
  ('order','dashboard:read'),
  ('order','order:read'),('order','order:write'),('order','order:refund'),('order','order:export'),
  ('order','settings:read'),('order','statistics:read'),
  ('member','dashboard:read'),
  ('member','member:read'),
  ('member','storedvalue:read'),('member','storedvalue:adjust'),
  ('member','settings:read'),('member','statistics:read')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ── 4. 超级管理员账号（密码 admin123，首次部署后请立即修改）──
-- bcrypt hash for 'admin123' (cost 12)
INSERT INTO admins (username, name, password_hash, role_code, status,
                    must_change_password, failed_attempts, password_changed_at, updated_at)
VALUES (
  'admin', '超级管理员',
  '$2b$12$RtmWysck/Yed/58nCTfrDe1tSv1jhffZ/G4tfRGyShDhYQ/QlUnnu',
  'super', 1, false, 0, NOW(), NOW()
)
ON CONFLICT (username) DO NOTHING;

-- ── 5. 风味标签（12 个）───────────────────────────────────────
INSERT INTO flavor_tags (name, category, ai_weight, score_map, enabled, updated_at) VALUES
  ('果香',  '果香系', 0.80, '{"果香":80}',    true, NOW()),
  ('木香',  '木香系', 0.85, '{"木香":85}',    true, NOW()),
  ('烟草',  '烟草系', 0.90, '{"烟草":90}',    true, NOW()),
  ('辛辣',  '辛辣系', 0.75, '{"辛辣":75}',    true, NOW()),
  ('土壤',  '土香系', 0.70, '{"土壤":70}',    true, NOW()),
  ('甜感',  '甜香系', 0.80, '{"甜感":80}',    true, NOW()),
  ('烘焙',  '咖啡系', 0.85, '{"烘焙":85}',    true, NOW()),
  ('皮革',  '皮革系', 0.70, '{"皮革":70}',    true, NOW()),
  ('坚果',  '坚果系', 0.75, '{"坚果":75}',    true, NOW()),
  ('咖啡',  '咖啡系', 0.85, '{"咖啡":85}',    true, NOW()),
  ('巧克力','可可系', 0.80, '{"巧克力":80}',  true, NOW()),
  ('花香',  '花香系', 0.65, '{"花香":65}',    true, NOW())
ON CONFLICT DO NOTHING;

-- ── 6. 充值档位（5 档）──────────────────────────────────────
INSERT INTO recharge_tiers (amount_cents, bonus_cents, display_name, sort_order, enabled, updated_at) VALUES
  ( 50000,      0, '500元',           1, true, NOW()),
  (100000,  10000, '1000元 送100元',  2, true, NOW()),
  (200000,  30000, '2000元 送300元',  3, true, NOW()),
  (300000,  50000, '3000元 送500元',  4, true, NOW()),
  (500000, 100000, '5000元 送1000元', 5, true, NOW())
ON CONFLICT DO NOTHING;

-- ── 7. 会员等级（充值/消费各 9 级）─────────────────────────
INSERT INTO level_configs (level_type, level, name, min_points, max_points, icon, enabled, updated_at)
SELECT
  lt.t,
  n.n,
  'V' || n.n,
  (n.n - 1) * 1000,
  CASE WHEN n.n < 9 THEN n.n * 1000 - 1 ELSE NULL END,
  CASE lt.t WHEN 'recharge' THEN 'vip' ELSE 'cigar' END,
  true,
  NOW()
FROM (VALUES ('recharge'), ('consumption')) AS lt(t)
CROSS JOIN generate_series(1, 9) AS n(n)
ON CONFLICT DO NOTHING;

-- ── 8. 系统配置 ──────────────────────────────────────────────
INSERT INTO system_configs (config_key, config_value, description) VALUES
  ('shop.name',               '"GOAT CIGAR CLUB"',  '门店名称'),
  ('shop.tagline',            '"山羊雪茄俱乐部"',    '门店标语'),
  ('shop.business_hours',     '"17:00 - 02:00"',    '营业时间'),
  ('shop.address',            '"（待配置）"',         '门店地址'),
  ('shop.phone',              '"（待配置）"',         '联系电话'),
  ('stored_value.discount_rate',  '0.9',            '会员储值折扣率'),
  ('order.expire_minutes',        '30',             '订单超时关闭分钟数'),
  ('review.auto_audit',           'false',          '评论是否自动通过'),
  ('push.new_cigar_enabled',      'true',           '新品上架推送开关'),
  ('meituan.auto_sync',           'false',          '美团订单自动推送'),
  ('meituan.api_key',             '""',             '美团 API Key（待配置）'),
  ('meituan.shop_id',             '""',             '美团门店ID（待配置）')
ON CONFLICT (config_key) DO NOTHING;

-- ── 9. 海报模板默认配置 ──────────────────────────────────────
INSERT INTO poster_templates (id, bg_color, accent_color, font_style, club_name, tagline, updated_at)
VALUES (1, '#0D0D0D', '#C9A84C', 'serif', 'GOAT CIGAR CLUB', '山羊雪茄俱乐部', NOW())
ON CONFLICT (id) DO NOTHING;
