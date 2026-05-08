"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
pg_1.types.setTypeParser(20, BigInt);
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 开始 SEED...');
    await prisma.role.createMany({
        data: [
            { code: 'super', name: '超级管理员', description: '拥有全部权限，不可删除' },
            { code: 'product', name: '商品管理员', description: '商品/雪茄库管理' },
            { code: 'order', name: '订单管理员', description: '订单管理' },
            { code: 'member', name: '会员管理员', description: '会员/储值管理' },
        ],
        skipDuplicates: true,
    });
    await prisma.permission.createMany({
        data: [
            { code: 'dashboard:read', name: '数据概览-读', module: 'dashboard' },
            { code: 'product:read', name: '商品-读', module: 'product' },
            { code: 'product:write', name: '商品-写', module: 'product' },
            { code: 'product:delete', name: '商品-删', module: 'product' },
            { code: 'library:read', name: '雪茄库-读', module: 'library' },
            { code: 'library:write', name: '雪茄库-写', module: 'library' },
            { code: 'library:sync', name: '雪茄库-同步', module: 'library' },
            { code: 'tag:read', name: '标签-读', module: 'tag' },
            { code: 'tag:write', name: '标签-写', module: 'tag' },
            { code: 'order:read', name: '订单-读', module: 'order' },
            { code: 'order:write', name: '订单-写', module: 'order' },
            { code: 'order:refund', name: '订单-退款', module: 'order' },
            { code: 'order:export', name: '订单-导出', module: 'order' },
            { code: 'member:read', name: '会员-读', module: 'member' },
            { code: 'storedvalue:read', name: '储值-读', module: 'storedvalue' },
            { code: 'storedvalue:adjust', name: '储值-调整', module: 'storedvalue' },
            { code: 'storedvalue:level-config', name: '等级配置', module: 'storedvalue' },
            { code: 'review:read', name: '评价-读', module: 'review' },
            { code: 'review:moderate', name: '评价-审核', module: 'review' },
            { code: 'review:delete', name: '评价-删除', module: 'review' },
            { code: 'poster:read', name: '海报-读', module: 'poster' },
            { code: 'poster:template', name: '海报模板', module: 'poster' },
            { code: 'account:read', name: '账号-读', module: 'account' },
            { code: 'account:write', name: '账号-写', module: 'account' },
            { code: 'settings:read', name: '设置-读', module: 'settings' },
            { code: 'settings:write', name: '设置-写', module: 'settings' },
            { code: 'statistics:read', name: '统计-读', module: 'statistics' },
        ],
        skipDuplicates: true,
    });
    const superPerms = [
        'dashboard:read', 'product:read', 'product:write', 'product:delete',
        'library:read', 'library:write', 'library:sync',
        'tag:read', 'tag:write',
        'order:read', 'order:write', 'order:refund', 'order:export',
        'member:read', 'storedvalue:read', 'storedvalue:adjust', 'storedvalue:level-config',
        'review:read', 'review:moderate', 'review:delete',
        'poster:read', 'poster:template',
        'account:read', 'account:write',
        'settings:read', 'settings:write', 'statistics:read',
    ];
    const productPerms = [
        'dashboard:read', 'product:read', 'product:write', 'product:delete',
        'library:read', 'library:write', 'library:sync',
        'tag:read', 'tag:write',
        'review:read', 'review:moderate', 'review:delete',
        'poster:read', 'settings:read',
    ];
    const orderPerms = [
        'dashboard:read',
        'order:read', 'order:write', 'order:refund', 'order:export',
        'settings:read', 'statistics:read',
    ];
    const memberPerms = [
        'dashboard:read',
        'member:read',
        'storedvalue:read', 'storedvalue:adjust',
        'settings:read', 'statistics:read',
    ];
    for (const [roleCode, perms] of [
        ['super', superPerms],
        ['product', productPerms],
        ['order', orderPerms],
        ['member', memberPerms],
    ]) {
        await prisma.rolePermission.createMany({
            data: perms.map((p) => ({ roleCode, permissionCode: p })),
            skipDuplicates: true,
        });
    }
    await prisma.admin.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            name: '超级管理员',
            passwordHash: '$2b$12$LQKvZ0qx5xNzCB.jGvJMmuLqj6zZJq8Wls6rKxR9Dts5vJUkuYfFu',
            roleCode: 'super',
            status: 1,
            mustChangePassword: true,
        },
    });
    await prisma.category.createMany({
        data: [
            { type: 'cigar', code: 'luxury', name: '奢华系列', sortOrder: 1 },
            { type: 'cigar', code: 'classic', name: '经典系列', sortOrder: 2 },
            { type: 'cigar', code: 'strong', name: '浓郁系列', sortOrder: 3 },
            { type: 'cigar', code: 'mild', name: '轻柔系列', sortOrder: 4 },
            { type: 'cigar', code: 'limited', name: '限量系列', sortOrder: 5 },
            { type: 'drink', code: 'whisky', name: '威士忌', sortOrder: 1 },
            { type: 'drink', code: 'brandy', name: '白兰地', sortOrder: 2 },
            { type: 'drink', code: 'rum', name: '朗姆酒', sortOrder: 3 },
            { type: 'drink', code: 'wine', name: '葡萄酒', sortOrder: 4 },
            { type: 'drink', code: 'tea', name: '茶饮', sortOrder: 5 },
            { type: 'drink', code: 'coffee', name: '咖啡', sortOrder: 6 },
        ],
        skipDuplicates: true,
    });
    await prisma.flavorTag.createMany({
        data: [
            { name: '果香', category: '果香', aiWeight: 0.8, scoreMap: { 果香: 80 } },
            { name: '木香', category: '木香', aiWeight: 0.8, scoreMap: { 木香: 80 } },
            { name: '烟草', category: '烟草', aiWeight: 0.9, scoreMap: { 烟草: 90 } },
            { name: '辛辣', category: '辛辣', aiWeight: 0.7, scoreMap: { 辛辣: 75 } },
            { name: '土壤', category: '土壤', aiWeight: 0.6, scoreMap: { 土壤: 70 } },
            { name: '甜感', category: '甜感', aiWeight: 0.7, scoreMap: { 甜感: 75 } },
            { name: '烘焙', category: '烘焙', aiWeight: 0.6, scoreMap: { 烘焙: 70 } },
            { name: '皮革', category: '木香', aiWeight: 0.7, scoreMap: { 木香: 75, 烟草: 40 } },
            { name: '坚果', category: '果香', aiWeight: 0.6, scoreMap: { 果香: 40, 烘焙: 70 } },
            { name: '咖啡', category: '烘焙', aiWeight: 0.7, scoreMap: { 烘焙: 80 } },
            { name: '巧克力', category: '甜感', aiWeight: 0.6, scoreMap: { 甜感: 75, 烘焙: 40 } },
            { name: '花香', category: '果香', aiWeight: 0.5, scoreMap: { 果香: 60 } },
        ],
        skipDuplicates: true,
    });
    const levelRows = [
        ...Array.from({ length: 9 }, (_, i) => ({
            levelType: 'recharge', level: i + 1, name: `V${i + 1}`,
            minPoints: i * 1000, maxPoints: i < 8 ? (i + 1) * 1000 - 1 : null, icon: 'vip',
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
            levelType: 'consumption', level: i + 1, name: `V${i + 1}`,
            minPoints: i * 1000, maxPoints: i < 8 ? (i + 1) * 1000 - 1 : null, icon: 'cigar',
        })),
    ];
    for (const row of levelRows) {
        await prisma.levelConfig.upsert({
            where: { levelType_level: { levelType: row.levelType, level: row.level } },
            update: {},
            create: row,
        });
    }
    await prisma.rechargeTier.createMany({
        data: [
            { amountCents: 50000, bonusCents: 0, displayName: '500 元', sortOrder: 1 },
            { amountCents: 100000, bonusCents: 10000, displayName: '1000 元 送 100', sortOrder: 2 },
            { amountCents: 200000, bonusCents: 30000, displayName: '2000 元 送 300', sortOrder: 3 },
            { amountCents: 300000, bonusCents: 50000, displayName: '3000 元 送 500', sortOrder: 4 },
            { amountCents: 500000, bonusCents: 100000, displayName: '5000 元 送 1000', sortOrder: 5 },
        ],
        skipDuplicates: true,
    });
    const questions = [
        {
            position: 1, title: '你的雪茄经验如何？', multi: false,
            options: [
                { label: '新手', score_delta: { 轻柔: 3, 甜感: 2 } },
                { label: '有过几次', score_delta: { 果香: 2, 甜感: 2 } },
                { label: '老饕', score_delta: { 烟草: 3, 木香: 2, 辛辣: 2 } },
            ],
        },
        {
            position: 2, title: '今天的心情？', multi: false,
            options: [
                { label: '放松', score_delta: { 甜感: 2, 果香: 2 } },
                { label: '专注', score_delta: { 木香: 2, 烘焙: 2 } },
                { label: '庆祝', score_delta: { 果香: 3, 花香: 2 } },
            ],
        },
        {
            position: 3, title: '你喜欢的风味？（多选）', multi: true,
            options: [
                { label: '果香', score_delta: { 果香: 3 } },
                { label: '木香', score_delta: { 木香: 3 } },
                { label: '烟草', score_delta: { 烟草: 3 } },
                { label: '辛辣', score_delta: { 辛辣: 3 } },
                { label: '甜感', score_delta: { 甜感: 3 } },
                { label: '烘焙', score_delta: { 烘焙: 3 } },
            ],
        },
        {
            position: 4, title: '打算抽多久？', multi: false,
            options: [
                { label: '30 分钟内', score_delta: {} },
                { label: '30-60 分钟', score_delta: {} },
                { label: '1 小时以上', score_delta: { 烟草: 2, 木香: 2 } },
            ],
        },
        {
            position: 5, title: '搭配什么？', multi: false,
            options: [
                { label: '威士忌', score_delta: { 烟草: 2, 烘焙: 2 } },
                { label: '咖啡', score_delta: { 烘焙: 3 } },
                { label: '什么都不要', score_delta: {} },
            ],
        },
    ];
    for (const q of questions) {
        await prisma.recommendQuestion.upsert({
            where: { id: BigInt(q.position) },
            update: {},
            create: { position: q.position, title: q.title, multi: q.multi, options: q.options },
        });
    }
    const configs = [
        { key: 'stored_value.discount_rate', value: 0.9, desc: '会员储值折扣率' },
        { key: 'push.new_cigar_enabled', value: true, desc: '新品上架推送总开关' },
        { key: 'shop.name', value: 'GOAT CIGAR CLUB', desc: '门店名称' },
        { key: 'shop.tagline', value: '山羊雪茄俱乐部', desc: '门店标语' },
        { key: 'shop.business_hours', value: '17:00 - 02:00', desc: '营业时间' },
        { key: 'shop.address', value: '待填写', desc: '门店地址' },
        { key: 'shop.phone', value: '待填写', desc: '门店电话' },
        { key: 'order.expire_minutes', value: 30, desc: '订单超时关闭分钟数' },
        { key: 'review.auto_audit', value: false, desc: '评论是否全部需审核' },
        { key: 'meituan.auto_sync', value: false, desc: '美团订单自动推送开关' },
    ];
    for (const c of configs) {
        await prisma.systemConfig.upsert({
            where: { configKey: c.key },
            update: {},
            create: { configKey: c.key, configValue: c.value, description: c.desc },
        });
    }
    console.log('✅ SEED 完成！');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed.js.map