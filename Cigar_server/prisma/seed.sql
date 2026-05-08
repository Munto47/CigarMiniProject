-- CigarPro SEED v2.0
INSERT INTO roles(code,name,description) VALUES
 ('super','超级管理员','拥有全部权限，不可删除'),
 ('product','商品管理员','商品/雪茄库管理'),
 ('order','订单管理员','订单管理'),
 ('member','会员管理员','会员/储值管理')
ON CONFLICT DO NOTHING;

INSERT INTO permissions(code,name,module) VALUES
 ('dashboard:read','数据概览-读','dashboard'),
 ('product:read','商品-读','product'),('product:write','商品-写','product'),('product:delete','商品-删','product'),
 ('library:read','雪茄库-读','library'),('library:write','雪茄库-写','library'),('library:sync','雪茄库-同步','library'),
 ('tag:read','标签-读','tag'),('tag:write','标签-写','tag'),
 ('order:read','订单-读','order'),('order:write','订单-写','order'),('order:refund','订单-退款','order'),('order:export','订单-导出','order'),
 ('member:read','会员-读','member'),
 ('storedvalue:read','储值-读','storedvalue'),('storedvalue:adjust','储值-调整','storedvalue'),('storedvalue:level-config','等级配置','storedvalue'),
 ('review:read','评价-读','review'),('review:moderate','评价-审核','review'),('review:delete','评价-删除','review'),
 ('poster:read','海报-读','poster'),('poster:template','海报模板','poster'),
 ('account:read','账号-读','account'),('account:write','账号-写','account'),
 ('settings:read','设置-读','settings'),('settings:write','设置-写','settings'),
 ('statistics:read','统计-读','statistics')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code) VALUES
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
ON CONFLICT DO NOTHING;

INSERT INTO admins(username,name,password_hash,role_code,status,must_change_password)
VALUES ('admin','超级管理员','$2b$12$LQKvZ0qx5xNzCB.jGvJMmuLqj6zZJq8Wls6rKxR9Dts5vJUkuYfFu','super',1,TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO categories(type,code,name,sort_order) VALUES
 ('cigar','luxury','奢华系列',1),('cigar','classic','经典系列',2),('cigar','strong','浓郁系列',3),
 ('cigar','mild','轻柔系列',4),('cigar','limited','限量系列',5),
 ('drink','whisky','威士忌',1),('drink','brandy','白兰地',2),('drink','rum','朗姆酒',3),
 ('drink','wine','葡萄酒',4),('drink','tea','茶饮',5),('drink','coffee','咖啡',6)
ON CONFLICT DO NOTHING;

INSERT INTO flavor_tags(name,category,ai_weight,score_map) VALUES
 ('果香','果香',0.8,'{"果香":80}'),('木香','木香',0.8,'{"木香":80}'),('烟草','烟草',0.9,'{"烟草":90}'),
 ('辛辣','辛辣',0.7,'{"辛辣":75}'),('土壤','土壤',0.6,'{"土壤":70}'),('甜感','甜感',0.7,'{"甜感":75}'),
 ('烘焙','烘焙',0.6,'{"烘焙":70}'),('皮革','木香',0.7,'{"木香":75,"烟草":40}'),
 ('坚果','果香',0.6,'{"果香":40,"烘焙":70}'),('咖啡','烘焙',0.7,'{"烘焙":80}'),
 ('巧克力','甜感',0.6,'{"甜感":75,"烘焙":40}'),('花香','果香',0.5,'{"果香":60}')
ON CONFLICT DO NOTHING;

INSERT INTO level_configs(level_type,level,name,min_points,max_points,icon,enabled) VALUES
 ('recharge',1,'V1',0,999,'vip',TRUE),('recharge',2,'V2',1000,1999,'vip',TRUE),
 ('recharge',3,'V3',2000,2999,'vip',TRUE),('recharge',4,'V4',3000,3999,'vip',TRUE),
 ('recharge',5,'V5',4000,4999,'vip',TRUE),('recharge',6,'V6',5000,5999,'vip',TRUE),
 ('recharge',7,'V7',6000,6999,'vip',TRUE),('recharge',8,'V8',7000,7999,'vip',TRUE),
 ('recharge',9,'V9',8000,NULL,'vip',TRUE),
 ('consumption',1,'V1',0,999,'cigar',TRUE),('consumption',2,'V2',1000,1999,'cigar',TRUE),
 ('consumption',3,'V3',2000,2999,'cigar',TRUE),('consumption',4,'V4',3000,3999,'cigar',TRUE),
 ('consumption',5,'V5',4000,4999,'cigar',TRUE),('consumption',6,'V6',5000,5999,'cigar',TRUE),
 ('consumption',7,'V7',6000,6999,'cigar',TRUE),('consumption',8,'V8',7000,7999,'cigar',TRUE),
 ('consumption',9,'V9',8000,NULL,'cigar',TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO recharge_tiers(amount_cents,bonus_cents,display_name,sort_order) VALUES
 (50000,0,'500 元',1),(100000,10000,'1000 元 送 100',2),
 (200000,30000,'2000 元 送 300',3),(300000,50000,'3000 元 送 500',4),
 (500000,100000,'5000 元 送 1000',5)
ON CONFLICT DO NOTHING;

INSERT INTO recommend_questions(position,title,multi,options,enabled) VALUES
 (1,'你的雪茄经验？',FALSE,'[{"label":"新手入门","flavorWeights":{"果香":3,"甜感":3}},{"label":"偶尔品吸","flavorWeights":{"木香":2,"烘焙":2,"果香":1,"甜感":1}},{"label":"资深老饕","flavorWeights":{"烟草":4,"辛辣":2,"土壤":2,"木香":1}}]',TRUE),
 (2,'偏好的口感强度？',FALSE,'[{"label":"轻柔温和","flavorWeights":{"甜感":3,"果香":2}},{"label":"中等浓郁","flavorWeights":{"木香":2,"烘焙":2,"果香":1}},{"label":"浓郁强劲","flavorWeights":{"烟草":3,"辛辣":3,"土壤":2}}]',TRUE),
 (3,'你喜欢的香气类型？',TRUE,'[{"label":"果香/花香","flavorWeights":{"果香":4}},{"label":"木香/雪松","flavorWeights":{"木香":4}},{"label":"烟草本味","flavorWeights":{"烟草":4}},{"label":"甜感/巧克力","flavorWeights":{"甜感":4}},{"label":"烘焙/咖啡/可可","flavorWeights":{"烘焙":4}},{"label":"辛辣/胡椒","flavorWeights":{"辛辣":4}},{"label":"土壤/皮革","flavorWeights":{"土壤":4}}]',TRUE),
 (4,'今天的品吸场景？',FALSE,'[{"label":"独处放松","flavorWeights":{"甜感":2,"果香":2}},{"label":"朋友聚会","flavorWeights":{"木香":1,"烘焙":1,"果香":1,"甜感":1}},{"label":"商务社交","flavorWeights":{"木香":3,"烟草":2}},{"label":"庆祝时刻","flavorWeights":{"烟草":2,"烘焙":2,"果香":2,"辛辣":1}}]',TRUE),
 (5,'预计品吸时长？',FALSE,'[{"label":"30分钟以内","flavorWeights":{"甜感":2,"果香":1}},{"label":"30-60分钟","flavorWeights":{"木香":2,"烘焙":1}},{"label":"1小时以上","flavorWeights":{"烟草":3,"辛辣":1,"土壤":1}}]',TRUE),
 (6,'搭配什么饮品？',FALSE,'[{"label":"威士忌/白兰地","flavorWeights":{"烟草":2,"辛辣":2,"烘焙":1}},{"label":"咖啡","flavorWeights":{"烘焙":4,"甜感":1}},{"label":"茶饮","flavorWeights":{"果香":3,"甜感":2}},{"label":"纯享(不搭配)","flavorWeights":{}}]',TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO system_configs(config_key,config_value,description) VALUES
 ('stored_value.discount_rate','0.9','会员储值折扣率'),
 ('push.new_cigar_enabled','true','新品上架推送总开关'),
 ('shop.name','"GOAT CIGAR CLUB"','门店名称'),
 ('shop.tagline','"山羊雪茄俱乐部"','门店标语'),
 ('shop.business_hours','"17:00 - 02:00"','营业时间'),
 ('shop.address','"待填写"','门店地址'),
 ('shop.phone','"待填写"','门店电话'),
 ('order.expire_minutes','30','订单超时关闭分钟数'),
 ('review.auto_audit','false','评论是否全部需审核'),
 ('meituan.auto_sync','false','美团订单自动推送开关')
ON CONFLICT DO NOTHING;

SELECT 'SEED完成 permissions=' || COUNT(*) FROM permissions;
