-- CigarPro 演示数据 v1.0
-- 基于已有基础种子数据(角色/权限/分类/标签/等级/充值档位/系统配置)补充业务演示数据

BEGIN;

-- ============================================================
-- 0. 为无默认值的 updated_at 列添加临时默认值(Prisma @updatedAt 不会生成数据库默认值)
-- ============================================================
ALTER TABLE cigars ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE drinks ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE reference_cigars ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE banners ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE activities ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE reviews ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE recharge_orders ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE recommend_questions ALTER COLUMN updated_at SET DEFAULT NOW();

-- ============================================================
-- 0. 清理重复数据
-- ============================================================
DELETE FROM recommend_questions WHERE id IN (7, 8, 9, 10);

-- ============================================================
-- 1. 更新现有用户信息 & 会员档案
-- ============================================================

-- 更新用户昵称和头像
UPDATE users SET nickname = '雪茄老饕张', avatar_url = '/assets/avatars/avatar_01.png', gender = 1, birthday = '1985-03-15' WHERE id = 1;
UPDATE users SET nickname = '威士忌猎人', avatar_url = '/assets/avatars/avatar_02.png', gender = 1, birthday = '1990-07-22' WHERE id = 2;
UPDATE users SET nickname = '夜风轻语', avatar_url = '/assets/avatars/avatar_03.png', gender = 2, birthday = '1995-11-08' WHERE id = 3;
UPDATE users SET nickname = '山羊老K', avatar_url = '/assets/avatars/avatar_04.png', gender = 1, birthday = '1978-01-30' WHERE id = 4;
UPDATE users SET nickname = '午后烟云', avatar_url = '/assets/avatars/avatar_05.png', gender = 1, birthday = '1988-06-18' WHERE id = 5;
UPDATE users SET nickname = '雪茄新手小白', avatar_url = '/assets/avatars/avatar_06.png', gender = 2, birthday = '1998-09-25' WHERE id = 6;
UPDATE users SET nickname = '烟雾诗人', avatar_url = '/assets/avatars/avatar_07.png', gender = 1, birthday = '1982-12-05' WHERE id = 7;
UPDATE users SET nickname = '品鉴师Leo', avatar_url = '/assets/avatars/avatar_08.png', gender = 1, birthday = '1992-04-14' WHERE id = 8;
UPDATE users SET nickname = '深夜雪茄客', avatar_url = '/assets/avatars/avatar_09.png', gender = 1, birthday = '1987-08-20' WHERE id = 9;
UPDATE users SET nickname = '雪莉桶爱好者', avatar_url = '/assets/avatars/avatar_10.png', gender = 2, birthday = '1993-02-11' WHERE id = 10;
UPDATE users SET nickname = '陈年古巴', avatar_url = '/assets/avatars/avatar_11.png', gender = 1, birthday = '1975-05-28' WHERE id = 11;
UPDATE users SET nickname = '烟斗转雪茄', avatar_url = '/assets/avatars/avatar_12.png', gender = 1, birthday = '1980-10-03' WHERE id = 12;
UPDATE users SET nickname = '周末品茄人', avatar_url = '/assets/avatars/avatar_13.png', gender = 1, birthday = '1991-01-19' WHERE id = 13;
UPDATE users SET nickname = '咖啡配雪茄', avatar_url = '/assets/avatars/avatar_14.png', gender = 2, birthday = '1996-07-07' WHERE id = 14;

-- 更新会员档案：余额、等级、积分(根据用户消费画像差异化)
UPDATE member_profiles SET balance_cents = 500000, recharge_level = 5, consumption_level = 4, recharge_points = 4800, consumption_points = 3500, total_recharge_cents = 500000, total_spend_cents = 320000, order_count = 28, login_count = 156 WHERE user_id = 1;
UPDATE member_profiles SET balance_cents = 150000, recharge_level = 3, consumption_level = 3, recharge_points = 2200, consumption_points = 2800, total_recharge_cents = 300000, total_spend_cents = 240000, order_count = 15, login_count = 89 WHERE user_id = 2;
UPDATE member_profiles SET balance_cents = 350000, recharge_level = 4, consumption_level = 3, recharge_points = 3500, consumption_points = 2600, total_recharge_cents = 400000, total_spend_cents = 210000, order_count = 12, login_count = 72 WHERE user_id = 3;
UPDATE member_profiles SET balance_cents = 1200000, recharge_level = 9, consumption_level = 7, recharge_points = 12000, consumption_points = 9500, total_recharge_cents = 1500000, total_spend_cents = 870000, order_count = 95, login_count = 320 WHERE user_id = 4;
UPDATE member_profiles SET balance_cents = 100000, recharge_level = 2, consumption_level = 2, recharge_points = 1500, consumption_points = 1600, total_recharge_cents = 200000, total_spend_cents = 120000, order_count = 9, login_count = 45 WHERE user_id = 5;
UPDATE member_profiles SET balance_cents = 30000, recharge_level = 1, consumption_level = 1, recharge_points = 500, consumption_points = 300, total_recharge_cents = 50000, total_spend_cents = 18000, order_count = 2, login_count = 12 WHERE user_id = 6;
UPDATE member_profiles SET balance_cents = 200000, recharge_level = 3, consumption_level = 4, recharge_points = 2800, consumption_points = 4200, total_recharge_cents = 300000, total_spend_cents = 380000, order_count = 22, login_count = 105 WHERE user_id = 7;
UPDATE member_profiles SET balance_cents = 820000, recharge_level = 7, consumption_level = 5, recharge_points = 8200, consumption_points = 5800, total_recharge_cents = 1000000, total_spend_cents = 520000, order_count = 41, login_count = 188 WHERE user_id = 8;
UPDATE member_profiles SET balance_cents = 250000, recharge_level = 3, consumption_level = 3, recharge_points = 2800, consumption_points = 2900, total_recharge_cents = 300000, total_spend_cents = 255000, order_count = 18, login_count = 94 WHERE user_id = 9;
UPDATE member_profiles SET balance_cents = 600000, recharge_level = 6, consumption_level = 5, recharge_points = 6200, consumption_points = 5100, total_recharge_cents = 700000, total_spend_cents = 460000, order_count = 35, login_count = 145 WHERE user_id = 10;
UPDATE member_profiles SET balance_cents = 2000000, recharge_level = 9, consumption_level = 8, recharge_points = 20000, consumption_points = 18000, total_recharge_cents = 3000000, total_spend_cents = 2100000, order_count = 180, login_count = 520 WHERE user_id = 11;
UPDATE member_profiles SET balance_cents = 450000, recharge_level = 5, consumption_level = 4, recharge_points = 4500, consumption_points = 3700, total_recharge_cents = 500000, total_spend_cents = 330000, order_count = 26, login_count = 132 WHERE user_id = 12;
UPDATE member_profiles SET balance_cents = 80000, recharge_level = 2, consumption_level = 2, recharge_points = 1200, consumption_points = 1400, total_recharge_cents = 100000, total_spend_cents = 95000, order_count = 7, login_count = 38 WHERE user_id = 13;
UPDATE member_profiles SET balance_cents = 300000, recharge_level = 4, consumption_level = 3, recharge_points = 3200, consumption_points = 2400, total_recharge_cents = 400000, total_spend_cents = 200000, order_count = 14, login_count = 78 WHERE user_id = 14;

-- ============================================================
-- 2. 雪茄数据(15款经典雪茄)
-- ============================================================

-- 先清除测试数据
DELETE FROM cigars WHERE id IN (3, 6);

INSERT INTO cigars (id, name, brand, model, spec, category_type, category_code, origin, year, wrapper, strength, duration,
                    price_cents, member_price_cents, stock, rating_avg, rating_count,
                    flavor_start, flavor_mid, flavor_end, flavor_scores, scenes, segments)
VALUES
-- 奢华系列
(101, '高希霸 世纪六号', 'Cohiba', 'Siglo VI', '单支', 'cigar', 'luxury',
 '古巴', '2023', '科罗拉多', '中等浓郁', '60-90分钟',
 88000, 79200, 25, 4.80, 128,
 '雪松木、奶油', '可可、咖啡、香料', '皮革、蜂蜜',
 '{"果香":70,"木香":85,"烟草":90,"辛辣":65,"甜感":78,"烘焙":72,"皮革":75}',
 ARRAY['商务应酬','私人品鉴','送礼佳品'],
 '[{"name":"商务精英","score":95},{"name":"资深茄客","score":90},{"name":"收藏家","score":88}]'),

(102, '蒙特克里斯托 2号', 'Montecristo', 'No.2', '单支', 'cigar', 'luxury',
 '古巴', '2023', '科罗拉多', '中等浓郁', '60-90分钟',
 68000, 61200, 30, 4.60, 95,
 '雪松木、坚果', '可可、咖啡', '香料、泥土',
 '{"果香":55,"木香":82,"烟草":78,"辛辣":50,"甜感":65,"烘焙":70,"坚果":75}',
 ARRAY['私人品鉴','下午时光'],
 '[{"name":"资深茄客","score":88},{"name":"日常享受","score":85}]'),

-- 经典系列
(103, '罗密欧与朱丽叶 短丘吉尔', 'Romeo y Julieta', 'Short Churchill', '单支', 'cigar', 'classic',
 '古巴', '2023', '科罗拉多', '中等浓郁', '45-60分钟',
 48000, 43200, 40, 4.30, 76,
 '雪松木、花香', '坚果、奶油', '皮革、蜂蜜',
 '{"果香":60,"木香":78,"烟草":65,"辛辣":40,"甜感":72,"花香":68,"坚果":65}',
 ARRAY['日常品鉴','下午时光','社交聚会'],
 '[{"name":"日常享受","score":82},{"name":"新手入门","score":70}]'),

(104, '帕特加斯 D4', 'Partagas', 'Serie D No.4', '单支', 'cigar', 'classic',
 '古巴', '2023', '科罗拉多马杜罗', '浓郁', '45-60分钟',
 42000, 37800, 35, 4.50, 112,
 '胡椒、雪松木', '可可、皮革', '泥土、香料',
 '{"木香":75,"烟草":85,"辛辣":80,"土壤":72,"烘焙":68,"皮革":78}',
 ARRAY['老饕品鉴','晚间享受','社交聚会'],
 '[{"name":"老饕","score":90},{"name":"浓郁爱好者","score":85}]'),

(105, '乌普曼 玛瑙46', 'H. Upmann', 'Magnum 46', '单支', 'cigar', 'classic',
 '古巴', '2023', '科罗拉多', '中等浓郁', '45-60分钟',
 38000, 34200, 30, 4.20, 58,
 '雪松木、花香', '坚果、奶油', '皮革、甜感',
 '{"果香":62,"木香":76,"烟草":60,"甜感":68,"花香":70,"坚果":62,"皮革":55}',
 ARRAY['日常品鉴','新手入门','下午时光'],
 '[{"name":"日常享受","score":78},{"name":"新手入门","score":72}]'),

-- 浓郁系列
(106, '奥利瓦 V系列 双托罗', 'Oliva', 'Serie V Double Toro', '单支', 'cigar', 'strong',
 '尼加拉瓜', '2023', '哈瓦那苏门答腊', '浓郁', '60-90分钟',
 35000, 31500, 50, 4.40, 89,
 '胡椒、可可', '咖啡、皮革', '泥土、香料',
 '{"木香":70,"烟草":82,"辛辣":85,"土壤":75,"烘焙":78,"咖啡":80,"巧克力":72,"皮革":70}',
 ARRAY['老饕品鉴','晚间享受','咖啡伴侣'],
 '[{"name":"老饕","score":88},{"name":"浓郁爱好者","score":86}]'),

(107, '我的父亲 法官', 'My Father', 'Le Bijou 1922', '单支', 'cigar', 'strong',
 '尼加拉瓜', '2023', '哈瓦那奥斯库罗', '浓郁', '60-90分钟',
 42000, 37800, 25, 4.70, 65,
 '可可、胡椒', '咖啡、皮革', '黑巧克力、泥土',
 '{"木香":68,"烟草":85,"辛辣":82,"土壤":78,"烘焙":80,"咖啡":85,"巧克力":88,"皮革":75}',
 ARRAY['老饕品鉴','晚间享受','威士忌伴侣'],
 '[{"name":"老饕","score":92},{"name":"资深茄客","score":85}]'),

(108, '帕德龙 1964 周年系列', 'Padron', '1964 Anniversary', '单支', 'cigar', 'strong',
 '尼加拉瓜', '2023', '尼加拉瓜马杜罗', '浓郁', '60-90分钟',
 56000, 50400, 20, 4.90, 42,
 '可可、咖啡', '黑巧克力、胡椒', '皮革、甜香料',
 '{"木香":65,"烟草":88,"辛辣":80,"甜感":70,"烘焙":85,"咖啡":90,"巧克力":92,"皮革":78}',
 ARRAY['特殊场合','收藏品鉴','送礼佳品'],
 '[{"name":"高端玩家","score":95},{"name":"收藏家","score":90}]'),

-- 轻柔系列
(109, '大卫杜夫 署名 2000', 'Davidoff', 'Signature 2000', '单支', 'cigar', 'mild',
 '多米尼加', '2023', '厄瓜多尔康涅狄格', '轻柔', '30-45分钟',
 28000, 25200, 45, 4.10, 52,
 '雪松木、奶油', '坚果、花香', '淡甜感',
 '{"果香":72,"木香":70,"烟草":45,"甜感":80,"花香":75,"坚果":68,"奶油":85}',
 ARRAY['新手入门','下午时光','社交聚会','高尔夫球场'],
 '[{"name":"新手入门","score":75},{"name":"轻柔爱好者","score":80}]'),

(110, '阿什顿 经典', 'Ashton', 'Classic', '单支', 'cigar', 'mild',
 '多米尼加', '2023', '康涅狄格遮阳', '轻柔-中等', '30-45分钟',
 25000, 22500, 40, 4.00, 38,
 '雪松木、奶油', '杏仁、白胡椒', '甜感',
 '{"果香":68,"木香":72,"烟草":40,"甜感":78,"坚果":70,"奶油":82}',
 ARRAY['新手入门','早晨享受','社交聚会'],
 '[{"name":"新手入门","score":72},{"name":"日常享受","score":70}]'),

(111, '蒙特克里斯托 白标', 'Montecristo', 'White Series', '单支', 'cigar', 'mild',
 '多米尼加', '2023', '康涅狄格遮阳', '轻柔-中等', '30-45分钟',
 22000, 19800, 55, 4.00, 45,
 '奶油、雪松木', '坚果、甜香料', '咖啡、蜂蜜',
 '{"果香":70,"木香":68,"烟草":42,"甜感":82,"坚果":72,"咖啡":55}',
 ARRAY['新手入门','日常品鉴','社交聚会'],
 '[{"name":"新手入门","score":78},{"name":"日常享受","score":75}]'),

-- 限量系列
(112, '高希霸 贝伊可 56', 'Cohiba', 'Behike 56', '单支', 'cigar', 'limited',
 '古巴', '2023', '科罗拉多', '中等浓郁', '60-90分钟',
 280000, 252000, 5, 4.95, 28,
 '雪松木、奶油', '可可、蜂蜜、香料', '皮革、花香',
 '{"果香":75,"木香":88,"烟草":85,"辛辣":60,"甜感":82,"烘焙":70,"花香":72,"皮革":80}',
 ARRAY['特殊场合','收藏品鉴','顶级送礼'],
 '[{"name":"收藏家","score":98},{"name":"高端玩家","score":95}]'),

(113, '阿图罗·富恩特 巨著X', 'Arturo Fuente', 'OpusX', '单支', 'cigar', 'limited',
 '多米尼加', '2023', '多米尼加罗萨多', '浓郁', '60-90分钟',
 128000, 115200, 8, 4.85, 35,
 '胡椒、雪松木', '可可、咖啡', '皮革、甜香料',
 '{"木香":78,"烟草":90,"辛辣":85,"甜感":68,"烘焙":82,"咖啡":85,"皮革":82,"巧克力":75}',
 ARRAY['特殊场合','收藏品鉴','资深茄客'],
 '[{"name":"收藏家","score":96},{"name":"高端玩家","score":92}]'),

(114, '大卫杜夫 马年纪念版', 'Davidoff', 'Year of the Horse', '单支', 'cigar', 'limited',
 '多米尼加', '2023', '厄瓜多尔哈瓦那', '中等浓郁', '45-60分钟',
 98000, 88200, 10, 4.60, 18,
 '雪松木、坚果', '可可、香料', '蜂蜜、皮革',
 '{"木香":80,"烟草":72,"辛辣":55,"甜感":75,"坚果":78,"皮革":70,"可可":72}',
 ARRAY['收藏品鉴','送礼佳品','特殊场合'],
 '[{"name":"收藏家","score":90},{"name":"高端玩家","score":85}]'),

(115, '千里达 创建', 'Trinidad', 'La Trova', '单支', 'cigar', 'limited',
 '古巴', '2023', '科罗拉多', '中等浓郁', '45-60分钟',
 88000, 79200, 12, 4.70, 22,
 '花香、雪松木', '坚果、蜂蜜', '奶油、皮革',
 '{"果香":72,"木香":82,"烟草":65,"甜感":78,"花香":85,"坚果":72,"奶油":80}',
 ARRAY['收藏品鉴','特殊场合','下午时光'],
 '[{"name":"收藏家","score":92},{"name":"高端玩家","score":86}]')

ON CONFLICT (id) DO NOTHING;

UPDATE cigars SET updated_at = NOW() WHERE updated_at IS NULL;

-- 更新序列
SELECT setval(pg_get_serial_sequence('cigars', 'id'), (SELECT MAX(id) FROM cigars));

-- ============================================================
-- 3. 雪茄-风味标签关联
-- ============================================================

INSERT INTO cigar_tags (cigar_id, tag_id) VALUES
-- 高希霸 世纪六号: 木香, 烟草, 甜感, 烘焙, 皮革
(101, 2), (101, 3), (101, 6), (101, 7), (101, 8),
-- 蒙特克里斯托 2号: 木香, 烟草, 甜感, 烘焙, 坚果
(102, 2), (102, 3), (102, 6), (102, 7), (102, 9),
-- 罗密欧与朱丽叶 短丘吉尔: 木香, 甜感, 花香, 坚果, 皮革
(103, 2), (103, 6), (103, 12), (103, 9), (103, 8),
-- 帕特加斯 D4: 烟草, 辛辣, 土壤, 烘焙, 皮革
(104, 3), (104, 4), (104, 5), (104, 7), (104, 8),
-- 乌普曼 玛瑙46: 木香, 甜感, 花香, 坚果, 皮革
(105, 2), (105, 6), (105, 12), (105, 9), (105, 8),
-- 奥利瓦 V系列: 辛辣, 土壤, 烘焙, 咖啡, 巧克力, 皮革
(106, 4), (106, 5), (106, 7), (106, 10), (106, 11), (106, 8),
-- 我的父亲 法官: 辛辣, 土壤, 烘焙, 咖啡, 巧克力, 皮革
(107, 4), (107, 5), (107, 7), (107, 10), (107, 11), (107, 8),
-- 帕德龙 1964: 烟草, 甜感, 烘焙, 咖啡, 巧克力, 皮革
(108, 3), (108, 6), (108, 7), (108, 10), (108, 11), (108, 8),
-- 大卫杜夫 署名 2000: 果香, 木香, 甜感, 花香, 坚果
(109, 1), (109, 2), (109, 6), (109, 12), (109, 9),
-- 阿什顿 经典: 果香, 木香, 甜感, 坚果
(110, 1), (110, 2), (110, 6), (110, 9),
-- 蒙特克里斯托 白标: 果香, 木香, 甜感, 坚果, 咖啡
(111, 1), (111, 2), (111, 6), (111, 9), (111, 10),
-- 高希霸 贝伊可 56: 果香, 木香, 烟草, 甜感, 烘焙, 花香, 皮革
(112, 1), (112, 2), (112, 3), (112, 6), (112, 7), (112, 12), (112, 8),
-- 阿图罗·富恩特 巨著X: 木香, 烟草, 辛辣, 甜感, 烘焙, 咖啡, 皮革, 巧克力
(113, 2), (113, 3), (113, 4), (113, 6), (113, 7), (113, 10), (113, 8), (113, 11),
-- 大卫杜夫 马年: 木香, 烟草, 甜感, 坚果, 皮革
(114, 2), (114, 3), (114, 6), (114, 9), (114, 8),
-- 千里达 创建: 果香, 木香, 甜感, 花香, 坚果
(115, 1), (115, 2), (115, 6), (115, 12), (115, 9)
ON CONFLICT (cigar_id, tag_id) DO NOTHING;

-- ============================================================
-- 4. 酒水数据
-- ============================================================

DELETE FROM drinks WHERE id IN (2, 3);

INSERT INTO drinks (id, name, category_type, category_code, price_cents, member_price_cents, stock, description, thumb_url, status, is_new) VALUES
-- 威士忌
(201, '麦卡伦 12年 单一麦芽', 'drink', 'whisky', 8800, 7920, 50, '苏格兰斯佩塞产区，雪莉桶熟成，干果与香料风味', '/assets/drinks/macallan12.png', 'active', true),
(202, '山崎 12年 单一麦芽', 'drink', 'whisky', 12800, 11520, 30, '日本三得利旗下，水楢桶陈酿，优雅果香', '/assets/drinks/yamazaki12.png', 'active', false),
(203, '阿德贝哥 10年', 'drink', 'whisky', 6800, 6120, 40, '艾雷岛经典重泥煤，烟熏与海盐风味', '/assets/drinks/ardbeg10.png', 'active', false),
(204, '百富 14年 加勒比桶', 'drink', 'whisky', 9800, 8820, 35, '朗姆酒桶二次熟成，热带水果与香草', '/assets/drinks/balvenie14.png', 'active', true),

-- 白兰地
(205, '轩尼诗 XO', 'drink', 'brandy', 22800, 20520, 20, '法国干邑，陈酿10年以上，醇厚复杂', '/assets/drinks/hennessy_xo.png', 'active', false),
(206, '马爹利 蓝带', 'drink', 'brandy', 15800, 14220, 25, '法国干邑经典之作，花果香气绵长', '/assets/drinks/martell_cb.png', 'active', false),

-- 朗姆酒
(207, '萨凯帕 23 珍藏', 'drink', 'rum', 7800, 7020, 30, '危地马拉高海拔陈酿，焦糖与可可风味', '/assets/drinks/zacapa23.png', 'active', true),
(208, '外交官 珍藏', 'drink', 'rum', 5800, 5220, 35, '委内瑞拉陈年朗姆，蜂蜜与干果香气', '/assets/drinks/diplomatico.png', 'active', false),

-- 葡萄酒
(209, '奔富 葛兰许 2019', 'drink', 'wine', 58000, 52200, 8, '澳洲酒王，西拉子单一园，陈年潜力20年+', '/assets/drinks/penfolds_grange.png', 'active', true),
(210, '作品一号 2018', 'drink', 'wine', 42000, 37800, 12, '纳帕谷顶级赤霞珠混酿，波尔多风格', '/assets/drinks/opus_one.png', 'active', false),

-- 茶饮
(211, '正山小种 金骏眉', 'drink', 'tea', 3800, 3420, 100, '武夷山桐木关核心产区，蜜香薯香', '/assets/drinks/jinjunmei.png', 'active', false),
(212, '大禹岭 高山乌龙', 'drink', 'tea', 2800, 2520, 80, '台湾合欢山高山茶，清香回甘', '/assets/drinks/dayuling.png', 'active', false),

-- 咖啡
(213, '埃塞俄比亚 耶加雪菲', 'drink', 'coffee', 1800, 1620, 200, '水洗处理，茉莉花香与柑橘酸', '/assets/drinks/yirgacheffe.png', 'active', true),
(214, '巴拿马 瑰夏 红标', 'drink', 'coffee', 6800, 6120, 30, '翡翠庄园竞标批次，花香爆炸', '/assets/drinks/geisha.png', 'active', true)

ON CONFLICT (id) DO NOTHING;

UPDATE drinks SET updated_at = NOW() WHERE updated_at IS NULL;

SELECT setval(pg_get_serial_sequence('drinks', 'id'), (SELECT MAX(id) FROM drinks));

-- ============================================================
-- 5. 雪茄-饮品搭配推荐
-- ============================================================

INSERT INTO pairings (cigar_id, drink_id, description, sort_order) VALUES
-- 高希霸 世纪六号 配 高端威士忌/白兰地
(101, 201, '麦卡伦雪莉桶的干果风味与世纪六号的可可、蜂蜜尾韵完美融合', 1),
(101, 202, '山崎水楢桶的清雅果香衬托世纪六号的复杂层次', 2),
(101, 205, '轩尼诗XO的陈年醇厚与世纪六号的皮革、蜂蜜尾韵相得益彰', 3),
-- 蒙特克里斯托 2号
(102, 201, '雪莉桶威士忌与蒙特2号的坚果可可风味互相成就', 1),
(102, 204, '加勒比桶的热带水果调性提升蒙特2号的甜感表现', 2),
-- 帕特加斯 D4 配 重泥煤威士忌
(104, 203, '阿德贝哥的重泥煤与D4的胡椒辛辣互相呼应，老饕经典搭配', 1),
(104, 207, '朗姆酒的焦糖甜感中和D4的浓郁强度', 2),
-- 大卫杜夫 署名2000 配 咖啡/茶
(109, 213, '耶加雪菲的柑橘花香与署名2000的轻柔奶油调性相配', 1),
(109, 212, '高山乌龙的清雅回甘衬托署名2000的细腻层次', 2),
-- 奥利瓦 V系列 配 咖啡
(106, 214, '瑰夏的爆炸花香与V系列的浓郁可可形成对比层次', 1),
(106, 203, '重泥煤威士忌与V系列的胡椒辛辣是阳刚搭配', 2),
-- 帕德龙 1964 配 高端饮品
(108, 205, 'XO的陈年复杂度才能匹配1964的顶级风味', 1),
(108, 202, '山崎12年的优雅与1964的巧克力咖啡互不压盖', 2),
-- 高希霸 贝伊可 配 顶级饮品
(112, 209, '葛兰许的酒王地位与贝伊可的王者风范相配', 1),
(112, 210, '作品一号的波尔多骨架衬托贝伊可的复杂层次', 2),
-- 罗密欧与朱丽叶 短丘吉尔
(103, 204, '加勒比桶的果香与短丘吉尔的花香甜感轻松愉悦', 1),
(103, 207, '朗姆酒的蜂蜜甜感呼应短丘吉尔的坚果奶油', 2),
-- 蒙特克里斯托 白标(轻柔) 配 咖啡/茶
(111, 213, '耶加雪菲的柑橘韵与白标的蜂蜜甜感是经典新手搭配', 1),
(111, 211, '金骏眉的蜜香与白标的奶油坚果互相烘托', 2)
ON CONFLICT (cigar_id, drink_id) DO NOTHING;

-- ============================================================
-- 6. 参考雪茄库
-- ============================================================

INSERT INTO reference_cigars (name, brand, category_code, strength, flavor_start, flavor_mid, flavor_end, remark) VALUES
('高希霸 罗布图', 'Cohiba', 'luxury', '中等浓郁', '雪松木、奶油', '可可、香料', '蜂蜜、皮革', '古巴雪茄之王，COHIBA的经典尺寸'),
('蒙特克里斯托 4号', 'Montecristo', 'classic', '中等浓郁', '雪松木、坚果', '可可、咖啡', '香料', '全球销量最高古巴雪茄之一'),
('罗密欧与朱丽叶 邱吉尔', 'Romeo y Julieta', 'classic', '温和-中等', '花香、雪松木', '坚果、蜂蜜', '皮革', '丘吉尔最爱的品牌'),
('好友 蒙特雷 双皇冠', 'Hoyo de Monterrey', 'classic', '中等浓郁', '雪松木、花香', '奶油、坚果', '蜂蜜', '古巴双皇冠代表'),
('玻利瓦尔 皇家皇冠', 'Bolivar', 'strong', '浓郁', '泥土、胡椒', '可可、皮革', '香料', '古巴浓郁之王'),
('富恩特 唐·卡洛斯', 'Arturo Fuente', 'luxury', '中等浓郁', '雪松木、奶油', '可可、坚果', '甜香料', '多米尼加巅峰之作'),
('阿什顿 VSG', 'Ashton', 'strong', '浓郁', '胡椒、可可', '咖啡、皮革', '泥土', '非古浓郁派标杆'),
('LFD 双利古罗', 'La Flor Dominicana', 'strong', '浓郁', '胡椒、黑咖啡', '黑巧克力、皮革', '泥土、香料', '多米尼加力量型代表'),
('普拉森西亚 阿尔玛·富尔特', 'Plasencia', 'luxury', '浓郁', '可可、胡椒', '黑巧克力、咖啡', '甜香料', '尼加拉瓜有机烟叶'),
('大卫杜夫 千禧混合', 'Davidoff', 'luxury', '中等浓郁', '雪松木、奶油', '可可、香料', '蜂蜜、皮革', '大卫杜夫旗舰系列');

UPDATE reference_cigars SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================================
-- 7. 轮播 Banner
-- ============================================================

INSERT INTO banners (title, image_url, link_type, link_target, position, sort_order, enabled) VALUES
('新品上市 | 大卫杜夫马年纪念版', '/assets/banners/banner_horse_year.png', 'cigar', '114', 'club', 1, true),
('限量到货 | 高希霸贝伊可56', '/assets/banners/banner_behike.png', 'cigar', '112', 'club', 2, true),
('威士忌品鉴之夜 | 每周五晚', '/assets/banners/banner_whisky_night.png', 'activity', '1', 'club', 3, true),
('新手入门指南 | 轻柔雪茄推荐', '/assets/banners/banner_beginner.png', 'category', 'mild', 'club', 4, true),
('会员储值加赠 | 最高送1000元', '/assets/banners/banner_recharge.png', 'recharge', '', 'club', 5, true);

-- ============================================================
-- 8. 活动
-- ============================================================

INSERT INTO activities (title, cover_url, description, start_at, end_at, enabled) VALUES
('威士忌 × 雪茄品鉴之夜',
 '/assets/activities/whisky_cigar_night.png',
 '每周五晚19:00-23:00，精选三款雪茄搭配三款威士忌，由资深品鉴师引导品鉴。费用：388元/位，会员价：298元/位。',
 '2026-05-09 19:00:00+08', '2026-06-27 23:00:00+08', true),

('新手雪茄入门课程',
 '/assets/activities/beginner_class.png',
 '每月第一个周六下午14:00-16:00，学习雪茄历史、剪切与点燃技巧、基础品鉴方法。赠送入门雪茄一支。费用：198元/位，会员免费。',
 '2026-05-10 14:00:00+08', '2026-12-06 16:00:00+08', true),

('古巴之夜 | 主题派对',
 '/assets/activities/cuba_night.png',
 '6月18日周六晚，古巴音乐、古巴朗姆酒、古巴雪茄三重奏。着装要求：热带休闲风。费用：688元/位。',
 '2026-06-18 19:00:00+08', '2026-06-19 02:00:00+08', true),

('储值满赠活动',
 '/assets/activities/recharge_promo.png',
 '即日起至6月30日，储值5000元送1000元，相当于8.3折。储值可用于购买店内任意商品，无有效期限制。',
 '2026-05-01 00:00:00+08', '2026-06-30 23:59:59+08', true),

('周末午后品鉴会',
 '/assets/activities/weekend_tasting.png',
 '每周六、日下午14:00-18:00，免费品鉴当日精选雪茄，搭配精品手冲咖啡。无需预约，到店即可参加。',
 '2026-05-01 00:00:00+08', '2026-12-31 18:00:00+08', true);

-- ============================================================
-- 9. 订单数据(需先于评价插入)
-- ============================================================

INSERT INTO orders (id, order_no, idempotency_key, user_id, user_name_snapshot, total_cents, member_discount_cents,
                    actual_pay_cents, pay_method, status, pickup_time, paid_at, completed_at, expire_at, created_at)
VALUES
(1, 'ORD20260501001', 'idem_001', 1, '雪茄老饕张', 88000, 8800, 79200, 'balance', 'completed', '2026-05-01 18:30', '2026-05-01 17:00:00+08', '2026-05-01 21:00:00+08', '2026-05-01 17:30:00+08', '2026-05-01 17:00:00+08'),
(2, 'ORD20260501002', 'idem_002', 2, '威士忌猎人', 68000, 6800, 61200, 'wechat', 'completed', '2026-05-01 19:00', '2026-05-01 18:00:00+08', '2026-05-01 22:00:00+08', '2026-05-01 18:30:00+08', '2026-05-01 18:00:00+08'),
(3, 'ORD20260501003', 'idem_003', 4, '山羊老K', 42000, 4200, 37800, 'balance', 'completed', '2026-05-01 20:00', '2026-05-01 19:00:00+08', '2026-05-01 23:00:00+08', '2026-05-01 19:30:00+08', '2026-05-01 19:00:00+08'),
(4, 'ORD20260502001', 'idem_004', 3, '夜风轻语', 28000, 2800, 25200, 'wechat', 'completed', '2026-05-02 14:00', '2026-05-02 13:00:00+08', '2026-05-02 16:00:00+08', '2026-05-02 13:30:00+08', '2026-05-02 13:00:00+08'),
(5, 'ORD20260502002', 'idem_005', 6, '雪茄新手小白', 25000, 2500, 22500, 'wechat', 'completed', '2026-05-02 14:30', '2026-05-02 14:00:00+08', '2026-05-02 17:00:00+08', '2026-05-02 14:30:00+08', '2026-05-02 14:00:00+08'),
(6, 'ORD20260502003', 'idem_006', 8, '品鉴师Leo', 68000, 6800, 61200, 'balance', 'completed', '2026-05-02 19:00', '2026-05-02 18:00:00+08', '2026-05-02 22:30:00+08', '2026-05-02 18:30:00+08', '2026-05-02 18:00:00+08'),
(7, 'ORD20260502004', 'idem_007', 11, '陈年古巴', 56000, 5600, 50400, 'balance', 'completed', '2026-05-02 20:30', '2026-05-02 19:30:00+08', '2026-05-02 23:00:00+08', '2026-05-02 20:00:00+08', '2026-05-02 19:30:00+08'),
(8, 'ORD20260503001', 'idem_008', 7, '烟雾诗人', 42000, 4200, 37800, 'wechat', 'completed', '2026-05-03 19:00', '2026-05-03 18:00:00+08', '2026-05-03 22:00:00+08', '2026-05-03 18:30:00+08', '2026-05-03 18:00:00+08'),
(9, 'ORD20260503002', 'idem_009', 9, '深夜雪茄客', 35000, 3500, 31500, 'balance', 'completed', '2026-05-03 20:00', '2026-05-03 19:00:00+08', '2026-05-03 23:30:00+08', '2026-05-03 19:30:00+08', '2026-05-03 19:00:00+08'),
(10, 'ORD20260504001', 'idem_010', 1, '雪茄老饕张', 35000, 3500, 31500, 'balance', 'completed', '2026-05-04 18:00', '2026-05-04 17:00:00+08', '2026-05-04 21:00:00+08', '2026-05-04 17:30:00+08', '2026-05-04 17:00:00+08'),
(11, 'ORD20260504002', 'idem_011', 5, '午后烟云', 22000, 2200, 19800, 'wechat', 'completed', '2026-05-04 15:00', '2026-05-04 14:00:00+08', '2026-05-04 17:00:00+08', '2026-05-04 14:30:00+08', '2026-05-04 14:00:00+08'),
(12, 'ORD20260505001', 'idem_012', 10, '雪莉桶爱好者', 48000, 4800, 43200, 'balance', 'paid', '2026-05-05 19:00', '2026-05-05 15:00:00+08', NULL, '2026-05-05 15:30:00+08', '2026-05-05 15:00:00+08'),
(13, 'ORD20260505002', 'idem_013', 11, '陈年古巴', 128000, 12800, 115200, 'balance', 'paid', '2026-05-05 20:00', '2026-05-05 16:00:00+08', NULL, '2026-05-05 16:30:00+08', '2026-05-05 16:00:00+08'),
(14, 'ORD20260505003', 'idem_014', 14, '咖啡配雪茄', 28000, 2800, 25200, 'wechat', 'pending', '2026-05-06 14:00', NULL, NULL, '2026-05-05 17:00:00+08', '2026-05-05 17:00:00+08'),
(15, 'ORD20260505004', 'idem_015', 4, '山羊老K', 88000, 8800, 79200, 'balance', 'pending', '2026-05-06 15:00', NULL, NULL, '2026-05-05 17:10:00+08', '2026-05-05 17:10:00+08');

-- 订单商品明细
INSERT INTO order_items (order_id, product_type, product_id, name_snapshot, spec_snapshot, price_cents_snapshot, member_price_snapshot, qty, actual_amount_cents, thumb_url_snapshot) VALUES
(1, 'cigar', 101, '高希霸 世纪六号', '单支', 88000, 79200, 1, 79200, '/assets/cigars/cohiba_siglo6.png'),
(2, 'cigar', 102, '蒙特克里斯托 2号', '单支', 68000, 61200, 1, 61200, '/assets/cigars/monte2.png'),
(3, 'cigar', 104, '帕特加斯 D4', '单支', 42000, 37800, 1, 37800, '/assets/cigars/partagas_d4.png'),
(4, 'cigar', 109, '大卫杜夫 署名 2000', '单支', 28000, 25200, 1, 25200, '/assets/cigars/davidoff_sig2000.png'),
(5, 'cigar', 110, '阿什顿 经典', '单支', 25000, 22500, 1, 22500, '/assets/cigars/ashton_classic.png'),
(6, 'cigar', 102, '蒙特克里斯托 2号', '单支', 68000, 61200, 1, 61200, '/assets/cigars/monte2.png'),
(7, 'cigar', 108, '帕德龙 1964 周年系列', '单支', 56000, 50400, 1, 50400, '/assets/cigars/padron1964.png'),
(8, 'cigar', 104, '帕特加斯 D4', '单支', 42000, 37800, 1, 37800, '/assets/cigars/partagas_d4.png'),
(9, 'cigar', 106, '奥利瓦 V系列 双托罗', '单支', 35000, 31500, 1, 31500, '/assets/cigars/oliva_v.png'),
(10, 'cigar', 106, '奥利瓦 V系列 双托罗', '单支', 35000, 31500, 1, 31500, '/assets/cigars/oliva_v.png'),
(11, 'cigar', 111, '蒙特克里斯托 白标', '单支', 22000, 19800, 1, 19800, '/assets/cigars/monte_white.png'),
(12, 'cigar', 103, '罗密欧与朱丽叶 短丘吉尔', '单支', 48000, 43200, 1, 43200, '/assets/cigars/ryj_short.png'),
(12, 'drink', 201, '麦卡伦 12年 单一麦芽', '单杯', 8800, 7920, 2, 15840, '/assets/drinks/macallan12.png'),
(13, 'cigar', 113, '阿图罗·富恩特 巨著X', '单支', 128000, 115200, 1, 115200, '/assets/cigars/opusx.png'),
(14, 'cigar', 109, '大卫杜夫 署名 2000', '单支', 28000, 25200, 1, 25200, '/assets/cigars/davidoff_sig2000.png'),
(14, 'drink', 213, '埃塞俄比亚 耶加雪菲', '单杯', 1800, 1620, 1, 1620, '/assets/drinks/yirgacheffe.png'),
(15, 'cigar', 101, '高希霸 世纪六号', '单支', 88000, 79200, 1, 79200, '/assets/cigars/cohiba_siglo6.png');

-- ============================================================
-- 10. 评价数据
-- ============================================================

INSERT INTO reviews (user_id, cigar_id, order_id, rating, content, status, recharge_level_snap, consumption_level_snap, created_at) VALUES
-- 订单1-15 对应评价
(1, 101, 1, 5, '世纪六号就是雪茄界的劳斯莱斯。前段雪松木和奶油的组合让人沉醉，中段可可和咖啡的风味层层展开，尾段的皮革和蜂蜜更是绝妙。每一次抽都是享受。', 'visible', 5, 4, '2026-05-01 20:30:00+08'),
(2, 102, 2, 4, '蒙特2号的鱼雷造型很漂亮，点燃后雪松木和坚果的风味很舒服。中段的咖啡感不够明显，但整体表现很稳定。', 'visible', 3, 3, '2026-05-01 18:00:00+08'),
(4, 104, 3, 5, 'D4是古巴浓郁派的标杆！胡椒的开场很有冲击力，中段的皮革和可可层次分明。搭配阿德贝哥10年威士忌，完美组合！', 'visible', 9, 7, '2026-05-01 22:00:00+08'),
(3, 109, 4, 4, '非常温柔的一支雪茄，适合女生和新手。奶油感很足，配一杯耶加雪菲简直完美下午茶组合。', 'visible', 4, 3, '2026-05-02 15:00:00+08'),
(6, 110, 5, 5, '作为雪茄新手，朋友推荐了阿什顿经典。真的很友好！不呛不辣，甜感很舒服，燃烧很均匀。果断入坑！', 'visible', 1, 1, '2026-05-03 14:00:00+08'),
(8, 102, 6, 5, '经典中的经典！蒙特2号是我入坑的第一支好雪茄，每次回购都能找到当初的感觉。可可的尾韵特别迷人。', 'visible', 7, 5, '2026-05-02 15:30:00+08'),
(11, 108, 7, 5, '收藏了五支1964，每次特殊日子才抽。这次抽的是陈年2年的，黑巧克力的尾韵让人念念不忘。', 'visible', 9, 8, '2026-05-05 20:00:00+08'),
(7, 104, 8, 4, 'D4浓郁但不刺激，抽到后半段泥土味开始上来。适合晚餐后来一支，不太适合新手。', 'visible', 3, 4, '2026-05-03 21:30:00+08'),
(9, 106, 9, 5, 'V系列双托罗可以抽90分钟，是深夜独处的最佳伴侣。胡椒和可可的平衡绝妙，尾段的泥土感恰到好处。', 'visible', 3, 3, '2026-05-03 22:30:00+08'),
(1, 106, 10, 4, '性价比超高的尼加拉瓜雪茄！浓郁度不输古巴货，咖啡和巧克力的风味很正。日常口粮的好选择。', 'visible', 5, 4, '2026-05-02 19:45:00+08'),
(5, 111, 11, 5, '白标是我的日常选择。价格亲民，品质稳定，咖啡和蜂蜜的组合每次都很满足。推荐给想入门的朋友。', 'visible', 2, 2, '2026-05-02 17:00:00+08'),
(10, 103, 12, 4, '短丘吉尔尺寸刚好，45分钟不长不短，适合饭后享受。花香很独特，是罗密欧的标志性风味。搭配麦卡伦12年，绝妙。', 'visible', 6, 5, '2026-05-05 13:00:00+08'),
(11, 113, 13, 5, '巨著X是艺术品。从点燃的第一口到最后一厘米，每一口都稳定输出顶级风味。贵，但值得。', 'visible', 9, 8, '2026-05-05 16:30:00+08'),
(14, 109, 14, 4, '轻柔派首选。搭配手冲咖啡，工作日下午来一支，不耽误晚上的事。唯一的缺点是时间偏短，30分钟就不够抽了。', 'visible', 4, 3, '2026-05-05 17:30:00+08'),
(4, 101, 15, 5, '高希霸从来没让人失望过。世纪六号的复杂度和平衡性都无可挑剔，是我会所里常备的口粮之一。推荐给有经验的茄客。', 'visible', 9, 7, '2026-05-05 18:00:00+08');

-- ============================================================
-- 11. 品鉴记录(AI + 手动)
-- ============================================================

INSERT INTO tasting_records (user_id, cigar_id, flavor_tags, flavor_scores, source, created_at) VALUES
(1, 101, ARRAY['木香','烟草','甜感','烘焙','皮革'], '{"木香":85,"烟草":90,"甜感":78,"烘焙":72,"皮革":75}', 'ai', '2026-05-01 20:35:00+08'),
(1, 106, ARRAY['辛辣','土壤','烘焙','咖啡','巧克力'], '{"辛辣":85,"土壤":75,"烘焙":78,"咖啡":80,"巧克力":72}', 'manual', '2026-05-04 21:05:00+08'),
(2, 102, ARRAY['木香','烟草','甜感','烘焙','坚果'], '{"木香":82,"烟草":78,"甜感":65,"烘焙":70,"坚果":75}', 'ai', '2026-05-01 22:05:00+08'),
(3, 109, ARRAY['果香','木香','甜感','花香','坚果'], '{"果香":72,"木香":70,"甜感":80,"花香":75,"坚果":68}', 'ai', '2026-05-02 16:05:00+08'),
(4, 104, ARRAY['烟草','辛辣','土壤','烘焙','皮革'], '{"烟草":85,"辛辣":80,"土壤":72,"烘焙":68,"皮革":78}', 'manual', '2026-05-01 23:05:00+08'),
(4, 101, ARRAY['木香','烟草','辛辣','甜感','皮革'], '{"木香":85,"烟草":90,"辛辣":65,"甜感":78,"皮革":75}', 'manual', '2026-05-02 21:05:00+08'),
(6, 109, ARRAY['果香','甜感','花香','坚果'], '{"果香":68,"甜感":78,"花香":70,"坚果":65}', 'ai', '2026-05-03 17:05:00+08'),
(7, 104, ARRAY['烟草','辛辣','土壤','皮革'], '{"烟草":82,"辛辣":78,"土壤":70,"皮革":75}', 'ai', '2026-05-03 22:05:00+08'),
(8, 102, ARRAY['木香','烟草','甜感','烘焙','坚果'], '{"木香":80,"烟草":75,"甜感":68,"烘焙":72,"坚果":75}', 'manual', '2026-05-02 18:35:00+08'),
(8, 108, ARRAY['烟草','辛辣','甜感','烘焙','咖啡','巧克力'], '{"烟草":88,"辛辣":80,"甜感":70,"烘焙":85,"咖啡":90,"巧克力":92}', 'ai', '2026-05-02 22:05:00+08'),
(9, 106, ARRAY['辛辣','土壤','烘焙','咖啡','皮革'], '{"辛辣":82,"土壤":75,"烘焙":80,"咖啡":85,"皮革":72}', 'ai', '2026-05-03 22:35:00+08'),
(10, 103, ARRAY['木香','甜感','花香','坚果'], '{"木香":78,"甜感":72,"花香":68,"坚果":65}', 'ai', '2026-05-05 13:05:00+08'),
(11, 101, ARRAY['木香','烟草','甜感','烘焙','皮革'], '{"木香":88,"烟草":92,"甜感":80,"烘焙":75,"皮革":78}', 'manual', '2026-05-03 19:20:00+08'),
(11, 108, ARRAY['烟草','辛辣','甜感','烘焙','咖啡','巧克力','皮革'], '{"烟草":90,"辛辣":82,"甜感":72,"烘焙":88,"咖啡":92,"巧克力":93,"皮革":80}', 'manual', '2026-05-05 20:05:00+08'),
(13, 111, ARRAY['果香','木香','甜感','坚果'], '{"果香":70,"木香":68,"甜感":82,"坚果":72}', 'ai', '2026-05-04 18:35:00+08');

-- ============================================================
-- 12. 海报数据
-- ============================================================

INSERT INTO posters (user_id, cigar_id, voice_text, flavor_tags, flavor_scores, poster_image_url, status, created_at) VALUES
(1, 101, '世纪六号是一场雪茄的盛宴，雪松木的清香、可可的醇厚、蜂蜜的甜美在这支高希霸中完美交织。', ARRAY['木香','烟草','甜感','烘焙','皮革'], '{"木香":85,"烟草":90,"甜感":78,"烘焙":72,"皮革":75}', '/assets/posters/poster_001.png', 'generated', '2026-05-01 20:40:00+08'),
(4, 104, '帕特加斯D4，浓郁派的王者之选。胡椒的辛辣开场，中段皮革与可可共舞，尾段的泥土让人臣服。搭配阿德贝哥，完美。', ARRAY['烟草','辛辣','土壤','烘焙','皮革'], '{"烟草":85,"辛辣":80,"土壤":72,"烘焙":68,"皮革":78}', '/assets/posters/poster_002.png', 'generated', '2026-05-01 23:10:00+08'),
(8, 108, '帕德龙1964，每一口都是对雪茄艺术的致敬。可可和咖啡的圆舞曲，黑巧的尾韵久久不散。', ARRAY['烟草','辛辣','甜感','烘焙','咖啡','巧克力','皮革'], '{"烟草":88,"辛辣":80,"甜感":70,"烘焙":85,"咖啡":90,"巧克力":92,"皮革":78}', '/assets/posters/poster_003.png', 'generated', '2026-05-02 22:10:00+08'),
(11, 112, '高希霸贝伊可56，古巴雪茄金字塔的顶端。从点燃到放下，每一厘米都是顶级的感官之旅。', ARRAY['果香','木香','烟草','甜感','花香','皮革'], '{"果香":75,"木香":88,"烟草":85,"甜感":82,"花香":72,"皮革":80}', '/assets/posters/poster_004.png', 'generated', '2026-05-05 14:00:00+08'),
(3, 109, '午后一支大卫杜夫署名2000，配一杯手冲耶加雪菲。柔软的奶油感混合咖啡的花果香，这就是理想中的下午茶时光。', ARRAY['果香','木香','甜感','花香','坚果'], '{"果香":72,"木香":70,"甜感":80,"花香":75,"坚果":68}', '/assets/posters/poster_005.png', 'generated', '2026-05-02 16:10:00+08');

-- ============================================================
-- 13. 充值流水(模拟历史充值)
-- ============================================================

INSERT INTO recharge_orders (recharge_no, idempotency_key, user_id, tier_id, amount_cents, bonus_cents, total_cents, status, channel, paid_at, expire_at, created_at) VALUES
('RCH20260501001', 'rch_idem_001', 1, 5, 200000, 30000, 230000, 'paid', 'wechat', '2026-05-01 10:00:00+08', '2027-05-01 10:00:00+08', '2026-05-01 10:00:00+08'),
('RCH20260501002', 'rch_idem_002', 4, 7, 500000, 100000, 600000, 'paid', 'wechat', '2026-05-01 11:00:00+08', '2027-05-01 11:00:00+08', '2026-05-01 11:00:00+08'),
('RCH20260502001', 'rch_idem_003', 11, 7, 500000, 100000, 600000, 'paid', 'wechat', '2026-05-02 09:30:00+08', '2027-05-02 09:30:00+08', '2026-05-02 09:30:00+08'),
('RCH20260503001', 'rch_idem_004', 8, 6, 300000, 50000, 350000, 'paid', 'wechat', '2026-05-03 14:00:00+08', '2027-05-03 14:00:00+08', '2026-05-03 14:00:00+08'),
('RCH20260504001', 'rch_idem_005', 2, 4, 100000, 10000, 110000, 'paid', 'wechat', '2026-05-04 16:00:00+08', '2027-05-04 16:00:00+08', '2026-05-04 16:00:00+08'),
('RCH20260505001', 'rch_idem_006', 10, 7, 500000, 100000, 600000, 'paid', 'wechat', '2026-05-05 12:00:00+08', '2027-05-05 12:00:00+08', '2026-05-05 12:00:00+08'),
('RCH20260505002', 'rch_idem_007', 3, 5, 200000, 30000, 230000, 'paid', 'wechat', '2026-05-05 12:30:00+08', '2027-05-05 12:30:00+08', '2026-05-05 12:30:00+08');

-- ============================================================
-- 14. 资产流水(模拟消费)
-- ============================================================

INSERT INTO balance_transactions (user_id, type, direction, amount_cents, balance_after_cents, related_type, related_id, related_no, description, created_at) VALUES
-- 充值流水
(1, 'recharge', 1, 230000, 730000, 'recharge_order', 1, 'RCH20260501001', '充值 2000元 送300元', '2026-05-01 10:00:00+08'),
(4, 'recharge', 1, 600000, 1800000, 'recharge_order', 2, 'RCH20260501002', '充值 5000元 送1000元', '2026-05-01 11:00:00+08'),
(11, 'recharge', 1, 600000, 2600000, 'recharge_order', 3, 'RCH20260502001', '充值 5000元 送1000元', '2026-05-02 09:30:00+08'),
(8, 'recharge', 1, 350000, 1170000, 'recharge_order', 4, 'RCH20260503001', '充值 3000元 送500元', '2026-05-03 14:00:00+08'),
(2, 'recharge', 1, 110000, 260000, 'recharge_order', 5, 'RCH20260504001', '充值 1000元 送100元', '2026-05-04 16:00:00+08'),
(10, 'recharge', 1, 600000, 1200000, 'recharge_order', 6, 'RCH20260505001', '充值 5000元 送1000元', '2026-05-05 12:00:00+08'),
(3, 'recharge', 1, 230000, 580000, 'recharge_order', 7, 'RCH20260505002', '充值 2000元 送300元', '2026-05-05 12:30:00+08'),
-- 消费流水
(1, 'consume', -1, 79200, 650800, 'order', 1, 'ORD20260501001', '消费 高希霸世纪六号', '2026-05-01 17:00:00+08'),
(4, 'consume', -1, 37800, 1762200, 'order', 3, 'ORD20260501003', '消费 帕特加斯D4', '2026-05-01 19:00:00+08'),
(4, 'consume', -1, 79200, 1683000, 'order', 15, 'ORD20260505004', '消费 高希霸世纪六号', '2026-05-05 17:10:00+08'),
(11, 'consume', -1, 50400, 2549600, 'order', 7, 'ORD20260502004', '消费 帕德龙1964', '2026-05-02 19:30:00+08'),
(11, 'consume', -1, 115200, 2434400, 'order', 13, 'ORD20260505002', '消费 富恩特巨著X', '2026-05-05 16:00:00+08'),
(8, 'consume', -1, 61200, 1108800, 'order', 6, 'ORD20260502003', '消费 蒙特克里斯托2号', '2026-05-02 18:00:00+08'),
(10, 'consume', -1, 59040, 1140960, 'order', 12, 'ORD20260505001', '消费 罗密欧短丘吉尔 + 麦卡伦12年', '2026-05-05 15:00:00+08'),
(1, 'consume', -1, 31500, 619300, 'order', 10, 'ORD20260504001', '消费 奥利瓦V系列', '2026-05-04 17:00:00+08');

-- ============================================================
-- 15. 积分流水(模拟等级成长)
-- ============================================================

INSERT INTO point_transactions (user_id, level_type, type, direction, points, points_after, related_type, related_no, description, created_at) VALUES
-- 充值积分
(1, 'recharge', 'recharge', 1, 2300, 4800, 'recharge_order', 'RCH20260501001', '充值获赠充值积分', '2026-05-01 10:00:00+08'),
(4, 'recharge', 'recharge', 1, 6000, 12000, 'recharge_order', 'RCH20260501002', '充值获赠充值积分', '2026-05-01 11:00:00+08'),
(11, 'recharge', 'recharge', 1, 6000, 20000, 'recharge_order', 'RCH20260502001', '充值获赠充值积分', '2026-05-02 09:30:00+08'),
-- 消费积分
(1, 'consumption', 'consume', 1, 792, 3500, 'order', 'ORD20260501001', '消费获赠消费积分', '2026-05-01 17:00:00+08'),
(4, 'consumption', 'consume', 1, 378, 9500, 'order', 'ORD20260501003', '消费获赠消费积分', '2026-05-01 19:00:00+08'),
(11, 'consumption', 'consume', 1, 504, 18000, 'order', 'ORD20260502004', '消费获赠消费积分', '2026-05-02 19:30:00+08');

-- ============================================================
-- 16. 等级变更日志
-- ============================================================

INSERT INTO level_change_logs (user_id, level_type, level_before, level_after, trigger_type, related_no, remark, created_at) VALUES
(1, 'recharge', 4, 5, 'recharge', 'RCH20260501001', '充值满5000，升级至V5', '2026-05-01 10:00:00+08'),
(4, 'recharge', 8, 9, 'recharge', 'RCH20260501002', '充值满15000，升级至V9', '2026-05-01 11:00:00+08'),
(11, 'recharge', 8, 9, 'recharge', 'RCH20260502001', '充值满20000，升级至V9', '2026-05-02 09:30:00+08'),
(1, 'consumption', 3, 4, 'order', 'ORD20260501001', '消费满3500，升级至V4', '2026-05-01 17:00:00+08');

-- ============================================================
-- 17. 海报模板
-- ============================================================

INSERT INTO poster_templates (id, logo_url, bg_color, accent_color, font_style, club_name, tagline) VALUES
(1, '/assets/logo.png', '#0D0D0D', '#C9A84C', 'serif', 'GOAT CIGAR CLUB', '山羊雪茄俱乐部 · 每一口都是时光的馈赠')
ON CONFLICT (id) DO UPDATE SET
  club_name = EXCLUDED.club_name,
  tagline = EXCLUDED.tagline;

-- ============================================================
-- 18. 推荐问题(基于 flavorWeights 推荐引擎)
-- ============================================================

DELETE FROM recommend_questions;

INSERT INTO recommend_questions (position, title, multi, options, enabled) VALUES
(1, '你的雪茄经验？', FALSE,
 '[{"label":"新手入门","flavorWeights":{"果香":3,"甜感":3}},{"label":"偶尔品吸","flavorWeights":{"木香":2,"烘焙":2,"果香":1,"甜感":1}},{"label":"资深老饕","flavorWeights":{"烟草":4,"辛辣":2,"土壤":2,"木香":1}}]',
 TRUE),
(2, '偏好的口感强度？', FALSE,
 '[{"label":"轻柔温和","flavorWeights":{"甜感":3,"果香":2}},{"label":"中等浓郁","flavorWeights":{"木香":2,"烘焙":2,"果香":1}},{"label":"浓郁强劲","flavorWeights":{"烟草":3,"辛辣":3,"土壤":2}}]',
 TRUE),
(3, '你喜欢的香气类型？', TRUE,
 '[{"label":"果香/花香","flavorWeights":{"果香":4}},{"label":"木香/雪松","flavorWeights":{"木香":4}},{"label":"烟草本味","flavorWeights":{"烟草":4}},{"label":"甜感/巧克力","flavorWeights":{"甜感":4}},{"label":"烘焙/咖啡/可可","flavorWeights":{"烘焙":4}},{"label":"辛辣/胡椒","flavorWeights":{"辛辣":4}},{"label":"土壤/皮革","flavorWeights":{"土壤":4}}]',
 TRUE),
(4, '今天的品吸场景？', FALSE,
 '[{"label":"独处放松","flavorWeights":{"甜感":2,"果香":2}},{"label":"朋友聚会","flavorWeights":{"木香":1,"烘焙":1,"果香":1,"甜感":1}},{"label":"商务社交","flavorWeights":{"木香":3,"烟草":2}},{"label":"庆祝时刻","flavorWeights":{"烟草":2,"烘焙":2,"果香":2,"辛辣":1}}]',
 TRUE),
(5, '预计品吸时长？', FALSE,
 '[{"label":"30分钟以内","flavorWeights":{"甜感":2,"果香":1}},{"label":"30-60分钟","flavorWeights":{"木香":2,"烘焙":1}},{"label":"1小时以上","flavorWeights":{"烟草":3,"辛辣":1,"土壤":1}}]',
 TRUE),
(6, '搭配什么饮品？', FALSE,
 '[{"label":"威士忌/白兰地","flavorWeights":{"烟草":2,"辛辣":2,"烘焙":1}},{"label":"咖啡","flavorWeights":{"烘焙":4,"甜感":1}},{"label":"茶饮","flavorWeights":{"果香":3,"甜感":2}},{"label":"纯享(不搭配)","flavorWeights":{}}]',
 TRUE);

-- ============================================================
-- 统一修复: 为通过原始SQL插入且无默认值的 updated_at 列设置时间戳
-- ============================================================
UPDATE banners SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE activities SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE reviews SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE orders SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE recharge_orders SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE recommend_questions SET updated_at = NOW() WHERE updated_at IS NULL;

COMMIT;

-- 汇总
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM cigars) AS cigars,
  (SELECT COUNT(*) FROM drinks) AS drinks,
  (SELECT COUNT(*) FROM cigar_tags) AS cigar_tags,
  (SELECT COUNT(*) FROM pairings) AS pairings,
  (SELECT COUNT(*) FROM reference_cigars) AS reference_cigars,
  (SELECT COUNT(*) FROM banners) AS banners,
  (SELECT COUNT(*) FROM activities) AS activities,
  (SELECT COUNT(*) FROM reviews) AS reviews,
  (SELECT COUNT(*) FROM orders) AS orders,
  (SELECT COUNT(*) FROM tasting_records) AS tasting_records,
  (SELECT COUNT(*) FROM posters) AS posters,
  (SELECT COUNT(*) FROM recommend_questions) AS recommend_questions;
