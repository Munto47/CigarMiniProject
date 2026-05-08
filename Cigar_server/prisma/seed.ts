import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================
// 工具函数
// ============================================================
function d(dateStr: string) {
  return new Date(dateStr);
}

async function main() {
  console.log('🧹 清空数据库...');

  // 按外键依赖倒序删除
  await prisma.recommendLog.deleteMany();
  await prisma.tastingRecord.deleteMany();
  await prisma.poster.deleteMany();
  await prisma.review.deleteMany();
  await prisma.meituanSyncLog.deleteMany();
  await prisma.reconciliationReport.deleteMany();
  await prisma.refundRecord.deleteMany();
  await prisma.paymentRecord.deleteMany();
  await prisma.paymentCallback.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.balanceTransaction.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.levelChangeLog.deleteMany();
  await prisma.levelRecalcJob.deleteMany();
  await prisma.rechargeOrder.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cigarTag.deleteMany();
  await prisma.pairing.deleteMany();
  await prisma.cigar.deleteMany();
  await prisma.drink.deleteMany();
  await prisma.referenceCigar.deleteMany();
  await prisma.memberProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.flavorTag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.levelConfig.deleteMany();
  await prisma.rechargeTier.deleteMany();
  await prisma.recommendQuestion.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.posterTemplate.deleteMany();
  await prisma.sensitiveWord.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.adminLoginLog.deleteMany();
  await prisma.operationLog.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.admin.deleteMany();

  console.log('✅ 数据清空完成');

  // ============================================================
  // 1. 角色 & 权限
  // ============================================================
  await prisma.role.createMany({
    data: [
      { code: 'super',   name: '超级管理员', description: '拥有全部权限' },
      { code: 'product', name: '商品管理员', description: '商品与雪茄库管理' },
      { code: 'order',   name: '订单管理员', description: '订单与数据统计' },
      { code: 'member',  name: '会员管理员', description: '会员与储值管理' },
    ],
  });

  await prisma.permission.createMany({
    data: [
      { code: 'dashboard:read',          name: '数据概览',     module: 'dashboard' },
      { code: 'product:read',            name: '商品查看',     module: 'product' },
      { code: 'product:write',           name: '商品编辑',     module: 'product' },
      { code: 'product:delete',          name: '商品删除',     module: 'product' },
      { code: 'library:read',            name: '雪茄库查看',   module: 'library' },
      { code: 'library:write',           name: '雪茄库编辑',   module: 'library' },
      { code: 'library:sync',            name: '雪茄库同步',   module: 'library' },
      { code: 'tag:read',                name: '标签查看',     module: 'tag' },
      { code: 'tag:write',               name: '标签编辑',     module: 'tag' },
      { code: 'order:read',              name: '订单查看',     module: 'order' },
      { code: 'order:write',             name: '订单处理',     module: 'order' },
      { code: 'order:refund',            name: '订单退款',     module: 'order' },
      { code: 'order:export',            name: '订单导出',     module: 'order' },
      { code: 'member:read',             name: '会员查看',     module: 'member' },
      { code: 'storedvalue:read',        name: '储值查看',     module: 'storedvalue' },
      { code: 'storedvalue:adjust',      name: '余额调整',     module: 'storedvalue' },
      { code: 'storedvalue:level-config',name: '等级配置',     module: 'storedvalue' },
      { code: 'review:read',             name: '评价查看',     module: 'review' },
      { code: 'review:moderate',         name: '评价审核',     module: 'review' },
      { code: 'review:delete',           name: '评价删除',     module: 'review' },
      { code: 'poster:read',             name: '海报查看',     module: 'poster' },
      { code: 'poster:template',         name: '海报模板',     module: 'poster' },
      { code: 'account:read',            name: '账号查看',     module: 'account' },
      { code: 'account:write',           name: '账号管理',     module: 'account' },
      { code: 'settings:read',           name: '设置查看',     module: 'settings' },
      { code: 'settings:write',          name: '设置编辑',     module: 'settings' },
      { code: 'statistics:read',         name: '数据统计',     module: 'statistics' },
    ],
  });

  const superPerms = [
    'dashboard:read','product:read','product:write','product:delete',
    'library:read','library:write','library:sync','tag:read','tag:write',
    'order:read','order:write','order:refund','order:export',
    'member:read','storedvalue:read','storedvalue:adjust','storedvalue:level-config',
    'review:read','review:moderate','review:delete',
    'poster:read','poster:template','account:read','account:write',
    'settings:read','settings:write','statistics:read',
  ];
  const productPerms = [
    'dashboard:read','product:read','product:write','product:delete',
    'library:read','library:write','library:sync','tag:read','tag:write',
    'review:read','review:moderate','review:delete','poster:read','settings:read',
  ];
  const orderPerms  = ['dashboard:read','order:read','order:write','order:refund','order:export','settings:read','statistics:read'];
  const memberPerms = ['dashboard:read','member:read','storedvalue:read','storedvalue:adjust','settings:read','statistics:read'];

  for (const [roleCode, perms] of [['super', superPerms],['product', productPerms],['order', orderPerms],['member', memberPerms]] as [string, string[]][]) {
    await prisma.rolePermission.createMany({
      data: perms.map(p => ({ roleCode, permissionCode: p })),
    });
  }

  // ============================================================
  // 2. 管理员账号（密码统一 admin123）
  // ============================================================
  // bcrypt hash for 'admin123' (cost 12) — verified correct
  const PWD = '$2b$12$RtmWysck/Yed/58nCTfrDe1tSv1jhffZ/G4tfRGyShDhYQ/QlUnnu';
  // passwordChangedAt 设为30天内，避免触发90天强制改密规则
  const pwdChangedAt = d('2026-04-15T00:00:00Z');
  const [adminSuper, adminProduct, adminOrder] = await Promise.all([
    prisma.admin.create({ data: { username: 'admin',       name: '超级管理员', passwordHash: PWD, roleCode: 'super',   status: 1, mustChangePassword: false, passwordChangedAt: pwdChangedAt, lastLoginAt: d('2026-05-05T10:30:00Z') } }),
    prisma.admin.create({ data: { username: 'product_mgr', name: '王小明',     passwordHash: PWD, roleCode: 'product', status: 1, mustChangePassword: false, passwordChangedAt: pwdChangedAt, lastLoginAt: d('2026-05-04T09:15:00Z') } }),
    prisma.admin.create({ data: { username: 'order_mgr',   name: '李小红',     passwordHash: PWD, roleCode: 'order',   status: 1, mustChangePassword: false, passwordChangedAt: pwdChangedAt, lastLoginAt: d('2026-05-03T14:20:00Z') } }),
  ]);

  // ============================================================
  // 3. 分类
  // ============================================================
  await prisma.category.createMany({
    data: [
      { type: 'cigar', code: 'luxury',  name: '奢华系列', sortOrder: 1 },
      { type: 'cigar', code: 'classic', name: '经典系列', sortOrder: 2 },
      { type: 'cigar', code: 'strong',  name: '浓郁系列', sortOrder: 3 },
      { type: 'cigar', code: 'mild',    name: '轻柔系列', sortOrder: 4 },
      { type: 'cigar', code: 'limited', name: '限量系列', sortOrder: 5 },
      { type: 'drink', code: 'whisky',  name: '威士忌',   sortOrder: 1 },
      { type: 'drink', code: 'brandy',  name: '白兰地',   sortOrder: 2 },
      { type: 'drink', code: 'rum',     name: '朗姆酒',   sortOrder: 3 },
      { type: 'drink', code: 'wine',    name: '葡萄酒',   sortOrder: 4 },
      { type: 'drink', code: 'tea',     name: '茶饮',     sortOrder: 5 },
      { type: 'drink', code: 'coffee',  name: '咖啡',     sortOrder: 6 },
    ],
  });

  // ============================================================
  // 4. 风味标签
  // ============================================================
  const tagFruit = await prisma.flavorTag.create({ data: { name: '果香甜润', category: '果香系', aiWeight: 0.80, scoreMap: { 果香: 80, 甜感: 60 } } });
  const tagWood  = await prisma.flavorTag.create({ data: { name: '木质烟草', category: '木香系', aiWeight: 0.90, scoreMap: { 木香: 80, 烟草: 70 } } });
  const tagEarth = await prisma.flavorTag.create({ data: { name: '泥土矿物', category: '土香系', aiWeight: 0.70, scoreMap: { 土壤: 85, 烟草: 40 } } });
  const tagCacao = await prisma.flavorTag.create({ data: { name: '咖啡可可', category: '咖啡系', aiWeight: 0.85, scoreMap: { 烘焙: 80, 甜感: 50 } } });
  const tagSpice = await prisma.flavorTag.create({ data: { name: '辛香胡椒', category: '辛香系', aiWeight: 0.75, scoreMap: { 辛辣: 85, 木香: 40 } } });
  const tagCream = await prisma.flavorTag.create({ data: { name: '奶油丝滑', category: '奶香系', aiWeight: 0.80, scoreMap: { 甜感: 75, 果香: 45 } } });
  const tagLeather = await prisma.flavorTag.create({ data: { name: '皮革木桶', category: '皮革系', aiWeight: 0.70, scoreMap: { 木香: 75, 土壤: 60, 烟草: 65 } } });
  const tagFloral  = await prisma.flavorTag.create({ data: { name: '花香清雅', category: '花香系', aiWeight: 0.60, scoreMap: { 果香: 70, 甜感: 65 } } });
  const tagNut     = await prisma.flavorTag.create({ data: { name: '坚果焦糖', category: '坚果系', aiWeight: 0.75, scoreMap: { 果香: 40, 烘焙: 70 } } });
  const tagVanilla = await prisma.flavorTag.create({ data: { name: '香草甜美', category: '甜香系', aiWeight: 0.65, scoreMap: { 甜感: 90, 果香: 55 } } });
  const tagPeat    = await prisma.flavorTag.create({ data: { name: '泥炭烟熏', category: '烟熏系', aiWeight: 0.60, scoreMap: { 土壤: 90, 烟草: 80, 辛辣: 55 } } });
  const tagCedar   = await prisma.flavorTag.create({ data: { name: '雪松丝绸', category: '木香系', aiWeight: 0.70, scoreMap: { 木香: 90, 果香: 35, 甜感: 40 } } });

  // ============================================================
  // 5. 雪茄商品（12款，覆盖全部分类）
  // ============================================================
  const cigar1 = await prisma.cigar.create({ data: {
    name: '高希霸 世纪六号', brand: 'Cohiba', model: 'Siglo VI', spec: '单支',
    categoryType: 'cigar', categoryCode: 'luxury', origin: '古巴', year: '2023',
    wrapper: '科罗拉多', strength: '中等浓郁', duration: '60-90分钟',
    priceCents: BigInt(88000), memberPriceCents: BigInt(79200), stock: 25,
    ratingAvg: 4.80, ratingCount: 128, isNew: false, status: 'active',
    flavorStart: '雪松木、奶油', flavorMid: '可可、咖啡、香料', flavorEnd: '皮革、蜂蜜',
    flavorScores: { 果香: 70, 木香: 85, 烟草: 90, 辛辣: 65, 甜感: 78, 烘焙: 72 },
    scenes: ['商务应酬', '私人品鉴', '送礼佳品'],
    segments: [{ name: '商务精英', score: 95 }, { name: '资深茄客', score: 90 }],
  }});

  const cigar2 = await prisma.cigar.create({ data: {
    name: '蒙特克里斯托 2号', brand: 'Montecristo', model: 'No.2', spec: '单支',
    categoryType: 'cigar', categoryCode: 'luxury', origin: '古巴', year: '2023',
    wrapper: '科罗拉多', strength: '中等浓郁', duration: '60-90分钟',
    priceCents: BigInt(68000), memberPriceCents: BigInt(61200), stock: 30,
    ratingAvg: 4.60, ratingCount: 95, isNew: false, status: 'active',
    flavorStart: '雪松木、坚果', flavorMid: '可可、咖啡', flavorEnd: '香料、泥土',
    flavorScores: { 果香: 55, 木香: 82, 烟草: 78, 辛辣: 50, 甜感: 65, 烘焙: 70 },
    scenes: ['私人品鉴', '下午时光'],
    segments: [{ name: '资深茄客', score: 88 }],
  }});

  const cigar3 = await prisma.cigar.create({ data: {
    name: '罗密欧 短丘吉尔', brand: 'Romeo y Julieta', model: 'Short Churchill', spec: '单支',
    categoryType: 'cigar', categoryCode: 'classic', origin: '古巴', year: '2023',
    wrapper: '科罗拉多', strength: '中等浓郁', duration: '45-60分钟',
    priceCents: BigInt(48000), memberPriceCents: BigInt(43200), stock: 40,
    ratingAvg: 4.30, ratingCount: 76, isNew: false, status: 'active',
    flavorStart: '雪松木、花香', flavorMid: '坚果、奶油', flavorEnd: '皮革、蜂蜜',
    flavorScores: { 果香: 60, 木香: 78, 烟草: 65, 辛辣: 40, 甜感: 72 },
    scenes: ['日常品鉴', '下午时光', '社交聚会'],
    segments: [{ name: '日常享受', score: 82 }],
  }});

  const cigar4 = await prisma.cigar.create({ data: {
    name: '帕特加斯 D4', brand: 'Partagas', model: 'Serie D No.4', spec: '单支',
    categoryType: 'cigar', categoryCode: 'classic', origin: '古巴', year: '2023',
    wrapper: '科罗拉多马杜罗', strength: '浓郁', duration: '45-60分钟',
    priceCents: BigInt(42000), memberPriceCents: BigInt(37800), stock: 35,
    ratingAvg: 4.50, ratingCount: 112, isNew: false, status: 'active',
    flavorStart: '胡椒、雪松木', flavorMid: '可可、皮革', flavorEnd: '泥土、香料',
    flavorScores: { 果香: 40, 木香: 75, 烟草: 88, 辛辣: 80, 甜感: 45 },
    scenes: ['独处放松', '深夜品鉴'],
    segments: [{ name: '浓度爱好者', score: 92 }],
  }});

  const cigar5 = await prisma.cigar.create({ data: {
    name: '玻利瓦尔 皇家冠', brand: 'Bolivar', model: 'Royal Coronas', spec: '单支',
    categoryType: 'cigar', categoryCode: 'strong', origin: '古巴', year: '2022',
    wrapper: '深色科罗拉多', strength: '醇厚强劲', duration: '30-45分钟',
    priceCents: BigInt(38000), memberPriceCents: BigInt(34200), stock: 50,
    ratingAvg: 4.40, ratingCount: 89, isNew: false, status: 'active',
    flavorStart: '泥土、雪松木', flavorMid: '皮革、咖啡', flavorEnd: '胡椒、矿物',
    flavorScores: { 果香: 30, 木香: 72, 烟草: 95, 辛辣: 88, 土壤: 82 },
    scenes: ['独处放松', '下午时光'],
    segments: [{ name: '浓度爱好者', score: 90 }],
  }});

  const cigar6 = await prisma.cigar.create({ data: {
    name: '利加 普利瓦达 No.9', brand: 'Drew Estate', model: 'Liga Privada No.9', spec: '单支',
    categoryType: 'cigar', categoryCode: 'strong', origin: '尼加拉瓜', year: '2023',
    wrapper: '马杜罗', strength: '浓郁丰厚', duration: '60-90分钟',
    priceCents: BigInt(58000), memberPriceCents: BigInt(52200), stock: 18,
    ratingAvg: 4.65, ratingCount: 53, isNew: false, status: 'active',
    flavorStart: '咖啡、泥土', flavorMid: '皮革木桶、巧克力', flavorEnd: '辛香、坚果',
    flavorScores: { 果香: 40, 木香: 75, 烟草: 88, 辛辣: 70, 土壤: 75, 烘焙: 85 },
    scenes: ['独处放松', '深夜品鉴'],
    segments: [{ name: '资深茄客', score: 91 }],
  }});

  const cigar7 = await prisma.cigar.create({ data: {
    name: '麦卡纽多 海德公园', brand: 'Macanudo', model: 'Hyde Park', spec: '单支',
    categoryType: 'cigar', categoryCode: 'mild', origin: '多米尼加', year: '2023',
    wrapper: '科罗拉多克拉罗', strength: '轻柔温和', duration: '30-45分钟',
    priceCents: BigInt(22000), memberPriceCents: BigInt(19800), stock: 75,
    ratingAvg: 4.00, ratingCount: 134, isNew: false, status: 'active',
    flavorStart: '甜感、巧克力', flavorMid: '奶油、坚果', flavorEnd: '木质余香',
    flavorScores: { 果香: 58, 木香: 52, 烟草: 48, 甜感: 88, 烘焙: 62 },
    scenes: ['新手入门', '社交聚会', '下午时光'],
    segments: [{ name: '入门推荐', score: 75 }],
  }});

  const cigar8 = await prisma.cigar.create({ data: {
    name: '大卫杜夫 千年系列 No.2', brand: 'Davidoff', model: 'Millennium Blend No.2', spec: '单支',
    categoryType: 'cigar', categoryCode: 'mild', origin: '多米尼加', year: '2023',
    wrapper: '厄瓜多尔克拉罗', strength: '轻柔温和', duration: '45-60分钟',
    priceCents: BigInt(55000), memberPriceCents: BigInt(49500), stock: 22,
    ratingAvg: 4.45, ratingCount: 67, isNew: false, status: 'active',
    flavorStart: '奶油、香草', flavorMid: '坚果、甜感', flavorEnd: '木质余香',
    flavorScores: { 果香: 62, 木香: 60, 烟草: 55, 甜感: 82, 烘焙: 58 },
    scenes: ['下午时光', '社交聚会', '新手入门'],
    segments: [{ name: '均衡入门', score: 80 }],
  }});

  const cigar9 = await prisma.cigar.create({ data: {
    name: '阿图罗 福恩特 OpusX', brand: 'Arturo Fuente', model: 'OpusX Fuente Fuente', spec: '单支',
    categoryType: 'cigar', categoryCode: 'limited', origin: '多米尼加', year: '2023',
    wrapper: '多米尼加天然', strength: '浓郁丰厚', duration: '60-90分钟',
    priceCents: BigInt(96000), memberPriceCents: BigInt(82000), stock: 12,
    ratingAvg: 4.75, ratingCount: 38, isNew: true, status: 'active',
    flavorStart: '花香、香草', flavorMid: '木质烟草、皮革', flavorEnd: '辛香胡椒、泥土',
    flavorScores: { 果香: 50, 木香: 88, 烟草: 85, 辛辣: 72, 土壤: 68 },
    scenes: ['独处休闲', '庆祝场合'],
    segments: [{ name: '收藏限量', score: 98 }],
  }});

  const cigar10 = await prisma.cigar.create({ data: {
    name: '帕德龙 1964 周年礼盒', brand: 'Padron', model: '1964 Anniversary Series', spec: '礼盒',
    categoryType: 'cigar', categoryCode: 'limited', origin: '尼加拉瓜', year: '2023',
    wrapper: '马杜罗', strength: '醇厚强劲', duration: '90分钟以上',
    priceCents: BigInt(320000), memberPriceCents: BigInt(275000), stock: 5,
    ratingAvg: 4.90, ratingCount: 22, isNew: true, status: 'active',
    flavorStart: '黑巧克力、咖啡', flavorMid: '皮革、泥土矿物', flavorEnd: '辛香、坚果',
    flavorScores: { 果香: 35, 木香: 70, 烟草: 92, 辛辣: 85, 土壤: 78, 烘焙: 88 },
    scenes: ['庆祝场合', '商务会谈'],
    segments: [{ name: '礼品首选', score: 99 }],
  }});

  const cigar11 = await prisma.cigar.create({ data: {
    name: '科依巴 西格洛三号', brand: 'Cohiba', model: 'Siglo III', spec: '单支',
    categoryType: 'cigar', categoryCode: 'luxury', origin: '古巴', year: '2022',
    wrapper: '科罗拉多', strength: '中等浓郁', duration: '30-45分钟',
    priceCents: BigInt(72000), memberPriceCents: BigInt(64800), stock: 20,
    ratingAvg: 4.70, ratingCount: 104, isNew: false, status: 'active',
    flavorStart: '雪松木、咖啡', flavorMid: '可可、泥土', flavorEnd: '皮革、香料',
    flavorScores: { 果香: 58, 木香: 88, 烟草: 85, 辛辣: 60, 甜感: 65, 烘焙: 78 },
    scenes: ['商务应酬', '私人品鉴'],
    segments: [{ name: '商务精英', score: 93 }],
  }});

  const cigar12 = await prisma.cigar.create({ data: {
    name: '格洛里亚 古巴 标志系列', brand: 'Gloria Cubana', model: 'Medaille d Or No.4', spec: '单支',
    categoryType: 'cigar', categoryCode: 'classic', origin: '古巴', year: '2022',
    wrapper: '自然', strength: '轻柔温和', duration: '30-45分钟',
    priceCents: BigInt(32000), memberPriceCents: BigInt(28800), stock: 60,
    ratingAvg: 4.20, ratingCount: 45, isNew: false, status: 'disabled',
    flavorStart: '花香、香草', flavorMid: '奶油、木质', flavorEnd: '淡淡甜美',
    flavorScores: { 果香: 65, 木香: 55, 烟草: 45, 甜感: 85 },
    scenes: ['下午时光', '新手入门'],
    segments: [{ name: '入门推荐', score: 78 }],
  }});

  // ============================================================
  // 6. 雪茄标签关联
  // ============================================================
  await prisma.cigarTag.createMany({ data: [
    { cigarId: cigar1.id, tagId: tagCedar.id },
    { cigarId: cigar1.id, tagId: tagCacao.id },
    { cigarId: cigar1.id, tagId: tagLeather.id },
    { cigarId: cigar2.id, tagId: tagWood.id },
    { cigarId: cigar2.id, tagId: tagNut.id },
    { cigarId: cigar2.id, tagId: tagEarth.id },
    { cigarId: cigar3.id, tagId: tagFloral.id },
    { cigarId: cigar3.id, tagId: tagCream.id },
    { cigarId: cigar4.id, tagId: tagSpice.id },
    { cigarId: cigar4.id, tagId: tagLeather.id },
    { cigarId: cigar5.id, tagId: tagPeat.id },
    { cigarId: cigar5.id, tagId: tagEarth.id },
    { cigarId: cigar6.id, tagId: tagCacao.id },
    { cigarId: cigar6.id, tagId: tagLeather.id },
    { cigarId: cigar7.id, tagId: tagVanilla.id },
    { cigarId: cigar7.id, tagId: tagCream.id },
    { cigarId: cigar8.id, tagId: tagCream.id },
    { cigarId: cigar8.id, tagId: tagNut.id },
    { cigarId: cigar9.id, tagId: tagFloral.id },
    { cigarId: cigar9.id, tagId: tagWood.id },
    { cigarId: cigar9.id, tagId: tagSpice.id },
    { cigarId: cigar10.id, tagId: tagCacao.id },
    { cigarId: cigar10.id, tagId: tagSpice.id },
    { cigarId: cigar10.id, tagId: tagPeat.id },
    { cigarId: cigar11.id, tagId: tagCedar.id },
    { cigarId: cigar11.id, tagId: tagCacao.id },
    { cigarId: cigar12.id, tagId: tagFloral.id },
    { cigarId: cigar12.id, tagId: tagVanilla.id },
  ]});

  // ============================================================
  // 7. 饮品商品（8款）
  // ============================================================
  const drink1 = await prisma.drink.create({ data: { name: '麦卡伦 12年雪莉桶', categoryType: 'drink', categoryCode: 'whisky', priceCents: BigInt(18000), memberPriceCents: BigInt(15500), stock: 32, description: '雪莉桶陈酿，干果与香草气息，搭配浓郁雪茄极佳', isNew: false, status: 'active' } });
  const drink2 = await prisma.drink.create({ data: { name: '格兰菲迪 15年三桶', categoryType: 'drink', categoryCode: 'whisky', priceCents: BigInt(15000), memberPriceCents: BigInt(13000), stock: 18, description: '三桶陈酿工艺，蜂蜜与香草交融，中段香气持久', isNew: false, status: 'active' } });
  const drink3 = await prisma.drink.create({ data: { name: '轩尼诗 VSOP', categoryType: 'drink', categoryCode: 'brandy', priceCents: BigInt(12000), memberPriceCents: BigInt(10500), stock: 25, description: '法国干邑，花果香馥郁，与轻柔雪茄相配绝佳', isNew: false, status: 'active' } });
  const drink4 = await prisma.drink.create({ data: { name: '古巴自由鸡尾酒', categoryType: 'drink', categoryCode: 'rum', priceCents: BigInt(6800), memberPriceCents: BigInt(5800), stock: 99, description: '朗姆可乐经典配方，清爽甘甜，休闲品吸首选', isNew: false, status: 'active' } });
  const drink5 = await prisma.drink.create({ data: { name: '精品手冲咖啡', categoryType: 'drink', categoryCode: 'coffee', priceCents: BigInt(4800), memberPriceCents: BigInt(4200), stock: 99, description: '单品豆手冲，风味纯净，苦甘平衡，提振感官', isNew: true, status: 'active' } });
  const drink6 = await prisma.drink.create({ data: { name: '武夷岩茶 大红袍', categoryType: 'drink', categoryCode: 'tea', priceCents: BigInt(3800), memberPriceCents: BigInt(3200), stock: 99, description: '岩韵明显，清洁口腔，茶烟共赏别有风味', isNew: false, status: 'active' } });
  const drink7 = await prisma.drink.create({ data: { name: '勃艮第黑皮诺红葡萄酒', categoryType: 'drink', categoryCode: 'wine', priceCents: BigInt(28000), memberPriceCents: BigInt(24500), stock: 12, description: '法国勃艮第，单宁细腻，与中等浓郁雪茄绝配', isNew: true, status: 'active' } });
  const drink8 = await prisma.drink.create({ data: { name: '巴拿马矿泉水 500ml', categoryType: 'drink', categoryCode: 'tea', priceCents: BigInt(2800), memberPriceCents: BigInt(2400), stock: 200, description: '进口矿泉水，清洁口腔，换茄必备', isNew: false, status: 'active' } });

  // ============================================================
  // 8. 配饮关联
  // ============================================================
  await prisma.pairing.createMany({ data: [
    { cigarId: cigar1.id, drinkId: drink1.id, description: '浓郁古巴雪茄搭配雪莉桶威士忌，香气层次完美呼应', sortOrder: 1 },
    { cigarId: cigar1.id, drinkId: drink3.id, description: '干邑花果香与雪松奶油底调相互提升', sortOrder: 2 },
    { cigarId: cigar2.id, drinkId: drink2.id, description: '蒙特的坚果可可与格兰菲迪蜂蜜香草融合', sortOrder: 1 },
    { cigarId: cigar3.id, drinkId: drink6.id, description: '轻柔花香雪茄与岩茶岩韵相得益彰', sortOrder: 1 },
    { cigarId: cigar3.id, drinkId: drink5.id, description: '咖啡与轻柔坚果奶油风味完美搭配', sortOrder: 2 },
    { cigarId: cigar4.id, drinkId: drink1.id, description: '帕特加斯的胡椒辛香与雪莉桶干果香形成对比', sortOrder: 1 },
    { cigarId: cigar5.id, drinkId: drink2.id, description: '玻利瓦尔浓郁土壤感配格兰菲迪柔和蜂蜜', sortOrder: 1 },
    { cigarId: cigar6.id, drinkId: drink1.id, description: '利加巧克力皮革与麦卡伦雪莉桶同频共振', sortOrder: 1 },
    { cigarId: cigar7.id, drinkId: drink5.id, description: '入门轻柔雪茄配精品咖啡，清新愉悦', sortOrder: 1 },
    { cigarId: cigar7.id, drinkId: drink4.id, description: '轻松搭配朗姆可乐，休闲氛围拉满', sortOrder: 2 },
  ]});

  // ============================================================
  // 9. 在售雪茄库（ReferenceCigar 用于 admin/library/instore）
  // ============================================================
  await prisma.referenceCigar.createMany({ data: [
    { name: '高希霸 世纪六号', brand: 'Cohiba', categoryCode: 'luxury', strength: '中等浓郁', flavorStart: '雪松木、奶油', flavorMid: '可可、咖啡', flavorEnd: '皮革、蜂蜜', remark: '旗舰产品，年度精选批次' },
    { name: '蒙特克里斯托 2号', brand: 'Montecristo', categoryCode: 'luxury', strength: '中等浓郁', flavorStart: '雪松木、坚果', flavorMid: '可可、咖啡', flavorEnd: '香料、泥土', remark: '经典锥形，深受资深茄客喜爱' },
    { name: '罗密欧 短丘吉尔', brand: 'Romeo y Julieta', categoryCode: 'classic', strength: '中等浓郁', flavorStart: '花香、雪松木', flavorMid: '坚果、奶油', flavorEnd: '皮革、蜂蜜', remark: '大众入门经典款' },
    { name: '帕特加斯 D4', brand: 'Partagas', categoryCode: 'classic', strength: '浓郁', flavorStart: '胡椒、雪松木', flavorMid: '可可、皮革', flavorEnd: '泥土、香料', remark: '浓度标杆，深受老饕推崇' },
    { name: '玻利瓦尔 皇家冠', brand: 'Bolivar', categoryCode: 'strong', strength: '醇厚强劲', flavorStart: '泥土、雪松木', flavorMid: '皮革、咖啡', flavorEnd: '胡椒、矿物', remark: '极致浓度，限量采购' },
    { name: '利加 普利瓦达 No.9', brand: 'Drew Estate', categoryCode: 'strong', strength: '浓郁丰厚', flavorStart: '咖啡、泥土', flavorMid: '皮革木桶、巧克力', flavorEnd: '辛香、坚果', remark: '尼加拉瓜顶级限量款' },
    { name: '麦卡纽多 海德公园', brand: 'Macanudo', categoryCode: 'mild', strength: '轻柔温和', flavorStart: '甜感、巧克力', flavorMid: '奶油、坚果', flavorEnd: '木质余香', remark: '新手友好首选' },
    { name: '阿图罗 福恩特 OpusX', brand: 'Arturo Fuente', categoryCode: 'limited', strength: '浓郁丰厚', flavorStart: '花香、香草', flavorMid: '木质烟草、皮革', flavorEnd: '辛香胡椒、泥土', remark: '全球最难获取限量款之一' },
    { name: '科依巴 西格洛三号', brand: 'Cohiba', categoryCode: 'luxury', strength: '中等浓郁', flavorStart: '雪松木、咖啡', flavorMid: '可可、泥土', flavorEnd: '皮革、香料', remark: '适合30-45分钟商务场合' },
    { name: '帕德龙 1964 周年', brand: 'Padron', categoryCode: 'limited', strength: '醇厚强劲', flavorStart: '黑巧克力、咖啡', flavorMid: '皮革、泥土', flavorEnd: '辛香、坚果', remark: '礼盒装，节日送礼首选' },
    // 行业参考条目（不单独售卖，用于风味对标）
    { name: 'My Father Le Bijou 1922', brand: 'My Father Cigars', categoryCode: 'strong', strength: '醇厚强劲', flavorStart: '黑巧克力、咖啡', flavorMid: '皮革、雪松', flavorEnd: '辛香胡椒', remark: '行业参考，尼加拉瓜顶级风味基准' },
    { name: 'Opus X Angel', brand: 'Arturo Fuente', categoryCode: 'limited', strength: '均衡适中', flavorStart: '花香、香草', flavorMid: '奶油、果香', flavorEnd: '丝滑甜美', remark: '行业参考，限量款风味标杆' },
    { name: 'Rocky Patel Vintage 1990', brand: 'Rocky Patel', categoryCode: 'classic', strength: '中等浓郁', flavorStart: '雪松木、咖啡', flavorMid: '皮革、泥土', flavorEnd: '香草、甜感', remark: '行业参考，洪都拉斯风味基准' },
    { name: 'Perdomo Reserve Champagne', brand: 'Perdomo', categoryCode: 'mild', strength: '轻柔温和', flavorStart: '奶油、香草', flavorMid: '坚果、花香', flavorEnd: '甜感余韵', remark: '行业参考，轻柔系标杆' },
    { name: 'Plasencia Alma del Campo', brand: 'Plasencia', categoryCode: 'strong', strength: '浓郁丰厚', flavorStart: '咖啡、黑胡椒', flavorMid: '皮革、可可', flavorEnd: '泥土矿物', remark: '行业参考，洪都拉斯混配基准' },
  ]});

  // ============================================================
  // 10. 等级配置（充值9级 + 消费9级）
  // ============================================================
  for (let i = 1; i <= 9; i++) {
    await prisma.levelConfig.createMany({ data: [
      { levelType: 'recharge',     level: i, name: `V${i}`, minPoints: BigInt((i - 1) * 1000), maxPoints: i < 9 ? BigInt(i * 1000 - 1) : null, icon: 'vip',   enabled: true },
      { levelType: 'consumption',  level: i, name: `V${i}`, minPoints: BigInt((i - 1) * 1000), maxPoints: i < 9 ? BigInt(i * 1000 - 1) : null, icon: 'cigar', enabled: true },
    ]});
  }

  // ============================================================
  // 11. 充值档位
  // ============================================================
  const tier1 = await prisma.rechargeTier.create({ data: { amountCents: BigInt(50000),  bonusCents: BigInt(0),      displayName: '500元',           sortOrder: 1, enabled: true } as any });
  const tier2 = await prisma.rechargeTier.create({ data: { amountCents: BigInt(100000), bonusCents: BigInt(10000), displayName: '1000元 送100元',  sortOrder: 2, enabled: true } as any });
  const tier3 = await prisma.rechargeTier.create({ data: { amountCents: BigInt(200000), bonusCents: BigInt(30000), displayName: '2000元 送300元',  sortOrder: 3, enabled: true } as any });
  const tier4 = await prisma.rechargeTier.create({ data: { amountCents: BigInt(300000), bonusCents: BigInt(50000), displayName: '3000元 送500元',  sortOrder: 4, enabled: true } as any });
  const tier5 = await prisma.rechargeTier.create({ data: { amountCents: BigInt(500000), bonusCents: BigInt(100000),displayName: '5000元 送1000元', sortOrder: 5, enabled: true } as any });
  void tier1; void tier2; void tier3; void tier4; void tier5;

  // ============================================================
  // 12. 演示用户 + 会员档案（8位）
  // ============================================================
  const users: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  const userData = [
    { openid: 'wx_demo_u001', nick: '雪茄老饕张', rechargeLevel: 8, consumeLevel: 7, rechargePts: 7500, consumePts: 6800, balance: 1280000, totalR: 3500000, totalS: 2460000, orders: 38 },
    { openid: 'wx_demo_u002', nick: '威士忌猎人', rechargeLevel: 5, consumeLevel: 4, rechargePts: 4800, consumePts: 3500, balance: 500000,  totalR: 500000,  totalS: 320000,  orders: 18 },
    { openid: 'wx_demo_u003', nick: '夜风轻语',   rechargeLevel: 3, consumeLevel: 3, rechargePts: 2200, consumePts: 2800, balance: 150000,  totalR: 300000,  totalS: 240000,  orders: 12 },
    { openid: 'wx_demo_u004', nick: '山羊老K',    rechargeLevel: 9, consumeLevel: 8, rechargePts:12000, consumePts:18000, balance: 2000000, totalR: 3000000, totalS: 2100000, orders: 95 },
    { openid: 'wx_demo_u005', nick: '午后烟云',   rechargeLevel: 2, consumeLevel: 2, rechargePts: 1500, consumePts: 1600, balance: 100000,  totalR: 200000,  totalS: 120000,  orders: 9  },
    { openid: 'wx_demo_u006', nick: '新手小白',   rechargeLevel: 1, consumeLevel: 1, rechargePts:  500, consumePts:  300, balance:  30000,  totalR:  50000,  totalS:  18000,  orders: 2  },
    { openid: 'wx_demo_u007', nick: '品鉴师Leo',  rechargeLevel: 6, consumeLevel: 5, rechargePts: 6200, consumePts: 5100, balance: 600000,  totalR: 700000,  totalS: 460000,  orders: 28 },
    { openid: 'wx_demo_u008', nick: '烟雾诗人',   rechargeLevel: 4, consumeLevel: 3, rechargePts: 3500, consumePts: 2600, balance: 350000,  totalR: 400000,  totalS: 210000,  orders: 14 },
  ];

  for (const u of userData) {
    const user = await prisma.user.create({ data: { openid: u.openid, nickname: u.nick, status: 1, lastLoginAt: d('2025-05-01T10:00:00Z') } });
    await prisma.memberProfile.create({ data: {
      userId: user.id,
      balanceCents:       BigInt(u.balance),
      rechargeLevel:      u.rechargeLevel,
      consumptionLevel:   u.consumeLevel,
      rechargePoints:     BigInt(u.rechargePts),
      consumptionPoints:  BigInt(u.consumePts),
      totalRechargeCents: BigInt(u.totalR),
      totalSpendCents:    BigInt(u.totalS),
      orderCount:         u.orders,
      loginCount:         u.orders * 4,
    }});
    users.push(user);
  }

  const [u1, u2, u3, u4, u5, u6, u7, u8] = users;

  // ============================================================
  // 13. 订单（12条，各种状态）
  // ============================================================
  type OrderStatus = 'pending' | 'paid' | 'settling' | 'completed' | 'cancelled' | 'refunding' | 'refunded';
  interface OrderDef { user: typeof u1; cigar: typeof cigar1; qty: number; price: bigint; status: OrderStatus; no: string; date: string; }
  const orderDefs: OrderDef[] = [
    { user: u1, cigar: cigar1,  qty: 2, price: cigar1.memberPriceCents,  status: 'completed', no: 'CC202504100001', date: '2025-04-10T14:30:00Z' },
    { user: u1, cigar: cigar2,  qty: 1, price: cigar2.memberPriceCents,  status: 'completed', no: 'CC202504180002', date: '2025-04-18T16:00:00Z' },
    { user: u2, cigar: cigar3,  qty: 3, price: cigar3.memberPriceCents,  status: 'completed', no: 'CC202504200003', date: '2025-04-20T11:00:00Z' },
    { user: u2, cigar: cigar4,  qty: 1, price: cigar4.memberPriceCents,  status: 'paid',      no: 'CC202505010004', date: '2025-05-01T19:00:00Z' },
    { user: u3, cigar: cigar5,  qty: 2, price: cigar5.memberPriceCents,  status: 'completed', no: 'CC202503150005', date: '2025-03-15T20:30:00Z' },
    { user: u4, cigar: cigar10, qty: 1, price: cigar10.memberPriceCents, status: 'completed', no: 'CC202504050006', date: '2025-04-05T18:00:00Z' },
    { user: u4, cigar: cigar9,  qty: 2, price: cigar9.memberPriceCents,  status: 'completed', no: 'CC202504120007', date: '2025-04-12T15:00:00Z' },
    { user: u5, cigar: cigar7,  qty: 1, price: cigar7.memberPriceCents,  status: 'pending',   no: 'CC202505050008', date: '2025-05-05T21:00:00Z' },
    { user: u6, cigar: cigar8,  qty: 1, price: cigar8.memberPriceCents,  status: 'cancelled', no: 'CC202504280009', date: '2025-04-28T13:00:00Z' },
    { user: u7, cigar: cigar11, qty: 1, price: cigar11.memberPriceCents, status: 'completed', no: 'CC202504220010', date: '2025-04-22T17:00:00Z' },
    { user: u7, cigar: cigar6,  qty: 2, price: cigar6.memberPriceCents,  status: 'refunded',  no: 'CC202503280011', date: '2025-03-28T16:00:00Z' },
    { user: u8, cigar: cigar3,  qty: 2, price: cigar3.memberPriceCents,  status: 'completed', no: 'CC202504300012', date: '2025-04-30T19:00:00Z' },
  ];

  const createdOrders: Awaited<ReturnType<typeof prisma.order.create>>[] = [];
  for (const od of orderDefs) {
    const totalCents = od.price * BigInt(od.qty);
    const order = await prisma.order.create({ data: {
      orderNo:          od.no,
      idempotencyKey:   `idem-${od.no}`,
      userId:           od.user.id,
      userNameSnapshot: od.user.nickname,
      totalCents:       totalCents,
      actualPayCents:   totalCents,
      payMethod:        'balance',
      status:           od.status,
      pickupTime:       '到店自提',
      paidAt:           od.status !== 'pending' && od.status !== 'cancelled' ? d(od.date) : null,
      completedAt:      od.status === 'completed' ? d(od.date) : null,
      cancelledAt:      od.status === 'cancelled' ? d(od.date) : null,
      evaluated:        od.status === 'completed',
      expireAt:         d('2026-12-31T23:59:59Z'),
      createdAt:        d(od.date),
    }});
    await prisma.orderItem.create({ data: {
      orderId:            order.id,
      productType:        'cigar',
      productId:          od.cigar.id,
      nameSnapshot:       od.cigar.name,
      specSnapshot:       od.cigar.spec,
      priceCentsSnapshot: od.cigar.priceCents,
      memberPriceSnapshot:od.price,
      qty:                od.qty,
      actualAmountCents:  totalCents,
    }});
    createdOrders.push(order);
  }

  // ============================================================
  // 14. 评价（10条）
  // ============================================================
  const reviewData = [
    { user: u1, cigar: cigar1,  order: createdOrders[0], rating: 5, content: '高希霸世纪六号不愧是顶级之作，前段雪松奶油香气浓郁，中段咖啡可可层次丰富，整体燃烧均匀，回甘绵长。' },
    { user: u1, cigar: cigar2,  order: createdOrders[1], rating: 5, content: '蒙特2号经典，锥形设计出烟完美，坚果香和可可搭配格外舒适，尾端香料辛香令人回味。' },
    { user: u2, cigar: cigar3,  order: createdOrders[2], rating: 4, content: '罗密欧短丘吉尔入门友好，花香清雅，奶油顺滑，非常适合下午茶时光，给朋友推荐了几支。' },
    { user: u2, cigar: cigar4,  order: createdOrders[3], rating: 4, content: '帕特加斯D4浓度十足，胡椒开场有冲击力，中段皮革可可很有质感，强烈推荐给喜欢浓郁风味的老饕。' },
    { user: u3, cigar: cigar5,  order: createdOrders[4], rating: 4, content: '玻利瓦尔皇家冠力道强劲，泥土矿物感明显，非常正宗的古巴风味，在夜晚独处时享用极佳。' },
    { user: u4, cigar: cigar10, order: createdOrders[5], rating: 5, content: '帕德龙1964礼盒装精美，巧克力咖啡开场震撼，整支燃烧90分钟毫无疲惫感，值得珍藏。收到时包装完好，服务一流！' },
    { user: u4, cigar: cigar9,  order: createdOrders[6], rating: 5, content: '阿图罗福恩特OpusX名不虚传，花香入场优雅，中段烟草木质层次感极强，辛香尾韵经久不散，此生必抽之一。' },
    { user: u7, cigar: cigar11, order: createdOrders[9], rating: 5, content: '科依巴西格洛三号非常适合商务场合，30分钟内燃完，雪松咖啡香气稳定，不失优雅格调。' },
    { user: u8, cigar: cigar3,  order: createdOrders[11], rating: 4, content: '罗密欧短丘吉尔很适合朋友聚会，性价比高，花香奶油风味受众很广，再购了两支备用。' },
    { user: u7, cigar: cigar6,  order: createdOrders[10], rating: 3, content: '利加普利瓦达浓度偏高了一些，但巧克力皮革层次确实丰富，可惜这次货不合心意办理了退款，下次再试其他批次。' },
  ];

  for (const rv of reviewData) {
    await prisma.review.create({ data: {
      userId:               rv.user.id,
      cigarId:              rv.cigar.id,
      orderId:              rv.order.id,
      rating:               rv.rating,
      content:              rv.content,
      status:               'approved',
      rechargeLevelSnap:    2,
      consumptionLevelSnap: 2,
      reviewedByAdminId:    adminSuper.id,
      reviewedAt:           d('2025-05-01T10:00:00Z'),
    }});
  }

  // ============================================================
  // 15. 海报记录（6条）
  // ============================================================
  const posterFlavors = [
    { user: u1, cigar: cigar1, tags: ['木质烟草', '咖啡可可', '皮革木桶'], text: '前段雪松清雅，中段咖啡可可层次丰富，尾段皮革回甘绵长，令人难忘。' },
    { user: u2, cigar: cigar3, tags: ['花香清雅', '奶油丝滑', '坚果焦糖'], text: '花香入场优雅，奶油过渡顺滑，坚果焦糖尾韵甜美，适合下午时光。' },
    { user: u4, cigar: cigar9, tags: ['木质烟草', '辛香胡椒', '泥土矿物'], text: '花香之后是强烈的木质烟草，辛香胡椒震撼口感，泥土矿物余韵深远。' },
    { user: u7, cigar: cigar11,tags: ['雪松丝绸', '咖啡可可', '皮革木桶'], text: '雪松丝绸般的入口，咖啡可可在中段充分展开，皮革尾韵优雅收尾。' },
    { user: u8, cigar: cigar7, tags: ['香草甜美', '奶油丝滑', '坚果焦糖'], text: '香草甜感贯穿始终，奶油丝滑顺口，坚果焦糖留余韵，新手必试。' },
    { user: u3, cigar: null,   tags: ['果香甜润', '花香清雅', '奶油丝滑'], text: '今日风味探索，果香甜润最为突出，花香清雅点缀，奶油尾韵令人愉悦。' },
  ];

  for (const pf of posterFlavors) {
    await prisma.poster.create({ data: {
      userId:    pf.user.id,
      cigarId:   pf.cigar ? pf.cigar.id : null,
      flavorTags:pf.tags,
      voiceText: pf.text,
      status:    'generated',
      createdAt: d('2025-04-28T20:00:00Z'),
    }});
  }

  // 海报模板
  await prisma.posterTemplate.create({ data: {
    id:         1,
    bgColor:    '#0D0D0D',
    accentColor:'#C9A84C',
    fontStyle:  'serif',
    clubName:   'GOAT CIGAR CLUB',
    tagline:    '山羊雪茄俱乐部',
    updatedBy:  adminSuper.id,
    updatedAt:  d('2025-01-01T00:00:00Z'),
  }});

  // ============================================================
  // 16. 敏感词库
  // ============================================================
  await prisma.sensitiveWord.createMany({ data: [
    { word: '假货', enabled: true },
    { word: '骗人', enabled: true },
    { word: '退款', enabled: false },
    { word: '投诉', enabled: true },
    { word: '差评', enabled: false },
  ]});

  // ============================================================
  // 17. 推荐问题（6题）
  // ============================================================
  await prisma.recommendQuestion.createMany({ data: [
    {
      id: BigInt(1), position: 1, title: '您的雪茄品吸经验如何？', multi: false, enabled: true,
      options: [
        { label: '新手入门（品吸不足1年）',  flavorWeights: { 果香: 3, 甜感: 3 } },
        { label: '偶尔品吸（1-3年经验）',    flavorWeights: { 木香: 2, 烘焙: 2, 果香: 1, 甜感: 1 } },
        { label: '资深老饕（3年以上）',      flavorWeights: { 烟草: 4, 辛辣: 2, 土壤: 2, 木香: 1 } },
      ],
    },
    {
      id: BigInt(2), position: 2, title: '您偏好的口感浓度？', multi: false, enabled: true,
      options: [
        { label: '轻柔温和', flavorWeights: { 甜感: 3, 果香: 2 } },
        { label: '中等浓郁', flavorWeights: { 木香: 2, 烘焙: 2, 果香: 1 } },
        { label: '浓郁强劲', flavorWeights: { 烟草: 3, 辛辣: 3, 土壤: 2 } },
      ],
    },
    {
      id: BigInt(3), position: 3, title: '您喜欢哪类香气？（可多选）', multi: true, enabled: true,
      options: [
        { label: '果香花香',   flavorWeights: { 果香: 4 } },
        { label: '木香雪松',   flavorWeights: { 木香: 4 } },
        { label: '烟草本味',   flavorWeights: { 烟草: 4 } },
        { label: '甜感巧克力', flavorWeights: { 甜感: 4 } },
        { label: '烘焙咖啡',   flavorWeights: { 烘焙: 4 } },
        { label: '辛辣胡椒',   flavorWeights: { 辛辣: 4 } },
        { label: '土壤皮革',   flavorWeights: { 土壤: 4 } },
      ],
    },
    {
      id: BigInt(4), position: 4, title: '今天的品吸场合是？', multi: false, enabled: true,
      options: [
        { label: '独处放松',   flavorWeights: { 甜感: 2, 果香: 2 } },
        { label: '朋友聚会',   flavorWeights: { 木香: 1, 烘焙: 1, 果香: 1, 甜感: 1 } },
        { label: '商务社交',   flavorWeights: { 木香: 3, 烟草: 2 } },
        { label: '庆祝时刻',   flavorWeights: { 烟草: 2, 烘焙: 2, 果香: 2, 辛辣: 1 } },
      ],
    },
    {
      id: BigInt(5), position: 5, title: '预计品吸时长？', multi: false, enabled: true,
      options: [
        { label: '30分钟以内', flavorWeights: { 甜感: 2, 果香: 1 } },
        { label: '30-60分钟', flavorWeights: { 木香: 2, 烘焙: 1 } },
        { label: '1小时以上', flavorWeights: { 烟草: 3, 辛辣: 1, 土壤: 1 } },
      ],
    },
    {
      id: BigInt(6), position: 6, title: '计划搭配什么饮品？', multi: false, enabled: true,
      options: [
        { label: '威士忌或白兰地', flavorWeights: { 烟草: 2, 辛辣: 2, 烘焙: 1 } },
        { label: '咖啡',          flavorWeights: { 烘焙: 4, 甜感: 1 } },
        { label: '茶饮',          flavorWeights: { 果香: 3, 甜感: 2 } },
        { label: '纯享不搭配',    flavorWeights: {} },
      ],
    },
  ]});

  // ============================================================
  // 18. 系统配置
  // ============================================================
  await prisma.systemConfig.createMany({ data: [
    { configKey: 'shop.name',              configValue: 'GOAT CIGAR CLUB',          description: '门店名称' },
    { configKey: 'shop.tagline',           configValue: '山羊雪茄俱乐部',            description: '门店标语' },
    { configKey: 'shop.business_hours',    configValue: '17:00 - 02:00',            description: '营业时间' },
    { configKey: 'shop.address',           configValue: '上海市静安区南京西路123号', description: '门店地址' },
    { configKey: 'shop.phone',             configValue: '021-88888888',              description: '门店电话' },
    { configKey: 'stored_value.discount_rate',  configValue: 0.9,   description: '会员储值折扣率' },
    { configKey: 'order.expire_minutes',        configValue: 30,    description: '订单超时关闭分钟数' },
    { configKey: 'review.auto_audit',           configValue: false, description: '评论是否自动通过' },
    { configKey: 'push.new_cigar_enabled',      configValue: true,  description: '新品上架推送开关' },
    { configKey: 'meituan.auto_sync',           configValue: false, description: '美团订单自动推送' },
    { configKey: 'meituan.api_key',             configValue: '',    description: '美团 API Key（待配置）' },
    { configKey: 'meituan.shop_id',             configValue: '',    description: '美团门店ID（待配置）' },
  ]});

  // ============================================================
  // 19. Banner + 活动
  // ============================================================
  await prisma.banner.createMany({ data: [
    { title: '欢迎来到山羊雪茄俱乐部', imageUrl: '/assets/banners/banner_welcome.png', position: 'club', sortOrder: 1, enabled: true, linkType: 'none' },
    { title: '会员储值享专属折扣',     imageUrl: '/assets/banners/banner_vip.png',     position: 'club', sortOrder: 2, enabled: true, linkType: 'none' },
    { title: '新品上市 | 帕德龙1964', imageUrl: '/assets/banners/banner_new.png',     position: 'club', sortOrder: 3, enabled: true, linkType: 'product' },
  ]});

  await prisma.activity.createMany({ data: [
    { title: '5月会员日双倍积分活动',   description: '5月每周六会员消费积分翻倍，赶快来店体验！', enabled: true, startAt: d('2025-05-01T00:00:00Z'), endAt: d('2025-05-31T23:59:59Z') },
    { title: '新品品鉴夜 | 帕德龙系列', description: '邀您体验帕德龙1964年份周年系列，专业品鉴师现场解说', enabled: true, startAt: d('2025-05-15T19:00:00Z'), endAt: d('2025-05-15T22:00:00Z') },
    { title: '古巴雪茄文化沙龙',        description: '探索古巴雪茄历史与文化，品味Cohiba与Montecristo经典系列', enabled: true, startAt: d('2025-06-01T15:00:00Z'), endAt: d('2025-06-01T18:00:00Z') },
  ]});

  // ============================================================
  // 20. 管理员操作日志 + 登录日志
  // ============================================================
  await prisma.adminLoginLog.createMany({ data: [
    { adminId: adminSuper.id,   username: 'admin',       result: 'success', ip: '192.168.1.100', createdAt: d('2025-05-05T10:30:00Z') },
    { adminId: adminProduct.id, username: 'product_mgr', result: 'success', ip: '192.168.1.101', createdAt: d('2025-05-04T09:15:00Z') },
    { adminId: adminOrder.id,   username: 'order_mgr',   result: 'success', ip: '192.168.1.102', createdAt: d('2025-05-03T14:20:00Z') },
    { adminId: null,            username: 'hacker',      result: 'failed',  ip: '1.2.3.4',       reason: '用户名或密码错误', createdAt: d('2025-05-02T03:00:00Z') },
    { adminId: adminSuper.id,   username: 'admin',       result: 'success', ip: '192.168.1.100', createdAt: d('2025-05-01T16:00:00Z') },
  ]});

  await prisma.operationLog.createMany({ data: [
    { adminId: adminSuper.id,   adminName: '超级管理员', module: 'product',  action: 'create', targetType: 'cigar', targetId: cigar9.id.toString(),  description: '创建雪茄：阿图罗 福恩特 OpusX',   level: 'info', createdAt: d('2025-04-20T10:00:00Z') },
    { adminId: adminProduct.id, adminName: '王小明',     module: 'product',  action: 'update', targetType: 'cigar', targetId: cigar1.id.toString(),  description: '更新雪茄库存：高希霸世纪六号',     level: 'info', createdAt: d('2025-05-01T09:30:00Z') },
    { adminId: adminProduct.id, adminName: '王小明',     module: 'product',  action: 'update', targetType: 'cigar', targetId: cigar12.id.toString(), description: '下架雪茄：格洛里亚标志系列',       level: 'info', createdAt: d('2025-05-02T11:00:00Z') },
    { adminId: adminOrder.id,   adminName: '李小红',     module: 'order',    action: 'update', targetType: 'order', targetId: '7',                   description: '处理退款订单 CC202503280011',       level: 'warning', createdAt: d('2025-04-01T14:00:00Z') },
    { adminId: adminSuper.id,   adminName: '超级管理员', module: 'review',   action: 'moderate', targetType: 'review', description: '审核通过10条评价',                 level: 'info', createdAt: d('2025-05-05T10:45:00Z') },
    { adminId: adminSuper.id,   adminName: '超级管理员', module: 'library',  action: 'create_instore', targetType: 'reference_cigar', description: '新增库内雪茄：帕德龙1964周年',   level: 'info', createdAt: d('2025-04-05T09:00:00Z') },
    { adminId: adminProduct.id, adminName: '王小明',     module: 'tag',      action: 'create', targetType: 'flavor_tag', description: '新增风味标签：泥炭烟熏',           level: 'info', createdAt: d('2025-04-10T10:00:00Z') },
    { adminId: adminSuper.id,   adminName: '超级管理员', module: 'settings', action: 'update', description: '更新系统配置：门店地址与电话',               level: 'info', createdAt: d('2025-04-15T16:00:00Z') },
  ]});

  console.log('');
  console.log('✅ 全量演示数据写入完成！');
  console.log('   管理员账号: admin / admin123');
  console.log('   商品管理员: product_mgr / admin123');
  console.log('   订单管理员: order_mgr / admin123');
  console.log(`   雪茄商品: 12款 | 饮品: 8款 | 库内记录: 15条`);
  console.log(`   演示用户: 8人 | 订单: 12条 | 评价: 10条 | 海报: 6张`);
  console.log(`   风味标签: 12个 | 推荐问题: 6题 | 充值档位: 5档`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); pool.end(); });
