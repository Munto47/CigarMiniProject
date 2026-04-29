// V1-V9 等级区间默认配置（每1000积分一级）
export const defaultRechargeLevelConfig = [
  { level: 1, name: 'V1', minPoints: 0, maxPoints: 999, icon: 'vip', enabled: true },
  { level: 2, name: 'V2', minPoints: 1000, maxPoints: 1999, icon: 'vip', enabled: true },
  { level: 3, name: 'V3', minPoints: 2000, maxPoints: 2999, icon: 'vip', enabled: true },
  { level: 4, name: 'V4', minPoints: 3000, maxPoints: 3999, icon: 'vip', enabled: true },
  { level: 5, name: 'V5', minPoints: 4000, maxPoints: 4999, icon: 'vip', enabled: true },
  { level: 6, name: 'V6', minPoints: 5000, maxPoints: 5999, icon: 'vip', enabled: true },
  { level: 7, name: 'V7', minPoints: 6000, maxPoints: 6999, icon: 'vip', enabled: true },
  { level: 8, name: 'V8', minPoints: 7000, maxPoints: 7999, icon: 'vip', enabled: true },
  { level: 9, name: 'V9', minPoints: 8000, maxPoints: null, icon: 'vip', enabled: true },
]

export const defaultConsumptionLevelConfig = [
  { level: 1, name: 'V1', minPoints: 0, maxPoints: 999, icon: 'cigar', enabled: true },
  { level: 2, name: 'V2', minPoints: 1000, maxPoints: 1999, icon: 'cigar', enabled: true },
  { level: 3, name: 'V3', minPoints: 2000, maxPoints: 2999, icon: 'cigar', enabled: true },
  { level: 4, name: 'V4', minPoints: 3000, maxPoints: 3999, icon: 'cigar', enabled: true },
  { level: 5, name: 'V5', minPoints: 4000, maxPoints: 4999, icon: 'cigar', enabled: true },
  { level: 6, name: 'V6', minPoints: 5000, maxPoints: 5999, icon: 'cigar', enabled: true },
  { level: 7, name: 'V7', minPoints: 6000, maxPoints: 6999, icon: 'cigar', enabled: true },
  { level: 8, name: 'V8', minPoints: 7000, maxPoints: 7999, icon: 'cigar', enabled: true },
  { level: 9, name: 'V9', minPoints: 8000, maxPoints: null, icon: 'cigar', enabled: true },
]

// 计算当前等级（根据积分和等级配置）
export function calcLevel(points, config) {
  const match = config.find(l => points >= l.minPoints && (l.maxPoints === null || points <= l.maxPoints))
  return match ? match.level : 1
}

// 计算距离下一等级还差多少积分
export function calcNextLevelGap(points, config) {
  const current = config.find(l => points >= l.minPoints && (l.maxPoints === null || points <= l.maxPoints))
  if (!current || current.maxPoints === null) return null
  return current.maxPoints - points + 1
}

export const mockMembers = [
  {
    id: 1,
    nickname: '林先生',
    avatar: null,
    rechargeLevel: 8,
    consumptionLevel: 7,
    rechargePoints: 7350,
    consumptionPoints: 6820,
    balance: 12800,
    totalRecharge: 35000,
    totalSpend: 24600,
    orderCount: 18,
    loginCount: 42,
    birthday: '1985-03-15',
    joinDate: '2023-09-01',
    lastLogin: '2024-06-03 15:20',
    phone: '139****6789',
    rechargeRecords: [
      { id: 101, orderNo: 'R20240601001', amount: 5000, paymentMethod: '微信支付', pointsAdded: 5000, levelBefore: 7, levelAfter: 8, status: 'success', time: '2024-06-01 10:22' },
      { id: 102, orderNo: 'R20240510001', amount: 10000, paymentMethod: '微信支付', pointsAdded: 10000, levelBefore: 6, levelAfter: 7, status: 'success', time: '2024-05-10 14:15' },
      { id: 103, orderNo: 'R20240320001', amount: 5000, paymentMethod: '微信支付', pointsAdded: 5000, levelBefore: 5, levelAfter: 6, status: 'success', time: '2024-03-20 09:30' },
    ],
    consumptionRecords: [
      { id: 201, orderNo: 'ORD20240603001', productInfo: 'Cohiba Behike 52', amount: 1100, paymentMethod: '储值余额', pointsAdded: 1100, levelBefore: 6, levelAfter: 7, orderStatus: 'completed', time: '2024-06-03 14:22', syncStatus: 'synced' },
      { id: 202, orderNo: 'ORD20240520001', productInfo: 'Davidoff Winston Churchill', amount: 920, paymentMethod: '美团收银', pointsAdded: 920, levelBefore: 6, levelAfter: 6, orderStatus: 'completed', time: '2024-05-20 19:00', syncStatus: 'synced' },
      { id: 203, orderNo: 'ORD20240415001', productInfo: 'Montecristo No.2 + 威士忌', amount: 1360, paymentMethod: '储值余额', pointsAdded: 1360, levelBefore: 5, levelAfter: 6, orderStatus: 'completed', time: '2024-04-15 20:30', syncStatus: 'synced' },
    ],
    levelChangeRecords: [
      { id: 301, levelType: 'recharge', levelBefore: 7, levelAfter: 8, triggerType: '充值升级', triggerOrderNo: 'R20240601001', time: '2024-06-01 10:22' },
      { id: 302, levelType: 'consumption', levelBefore: 6, levelAfter: 7, triggerType: '消费升级', triggerOrderNo: 'ORD20240603001', time: '2024-06-03 14:22' },
      { id: 303, levelType: 'recharge', levelBefore: 6, levelAfter: 7, triggerType: '充值升级', triggerOrderNo: 'R20240510001', time: '2024-05-10 14:15' },
      { id: 304, levelType: 'consumption', levelBefore: 5, levelAfter: 6, triggerType: '消费升级', triggerOrderNo: 'ORD20240415001', time: '2024-04-15 20:30' },
    ],
  },
  {
    id: 2,
    nickname: '张女士',
    avatar: null,
    rechargeLevel: 5,
    consumptionLevel: 4,
    rechargePoints: 5000,
    consumptionPoints: 4200,
    balance: 3200,
    totalRecharge: 8000,
    totalSpend: 8900,
    orderCount: 7,
    loginCount: 18,
    birthday: '1990-07-22',
    joinDate: '2024-01-15',
    lastLogin: '2024-06-03 11:30',
    phone: '138****2345',
    rechargeRecords: [
      { id: 104, orderNo: 'R20240520002', amount: 5000, paymentMethod: '微信支付', pointsAdded: 5000, levelBefore: 4, levelAfter: 5, status: 'success', time: '2024-05-20 15:30' },
      { id: 105, orderNo: 'R20240210001', amount: 3000, paymentMethod: '微信支付', pointsAdded: 3000, levelBefore: 3, levelAfter: 4, status: 'success', time: '2024-02-10 08:45' },
    ],
    consumptionRecords: [
      { id: 204, orderNo: 'ORD20240603002', productInfo: 'Davidoff Winston Churchill', amount: 1315, paymentMethod: '美团收银', pointsAdded: 1315, levelBefore: 3, levelAfter: 4, orderStatus: 'completed', time: '2024-06-03 16:45', syncStatus: 'synced' },
      { id: 205, orderNo: 'ORD20240518001', productInfo: 'Arturo Fuente OpusX', amount: 980, paymentMethod: '储值余额', pointsAdded: 980, levelBefore: 3, levelAfter: 3, orderStatus: 'completed', time: '2024-05-18 21:00', syncStatus: 'synced' },
    ],
    levelChangeRecords: [
      { id: 305, levelType: 'recharge', levelBefore: 4, levelAfter: 5, triggerType: '充值升级', triggerOrderNo: 'R20240520002', time: '2024-05-20 15:30' },
      { id: 306, levelType: 'consumption', levelBefore: 3, levelAfter: 4, triggerType: '消费升级', triggerOrderNo: 'ORD20240603002', time: '2024-06-03 16:45' },
    ],
  },
  {
    id: 3,
    nickname: '王先生',
    avatar: null,
    rechargeLevel: 3,
    consumptionLevel: 3,
    rechargePoints: 3000,
    consumptionPoints: 3200,
    balance: 1800,
    totalRecharge: 5000,
    totalSpend: 5600,
    orderCount: 5,
    loginCount: 11,
    birthday: '1978-11-08',
    joinDate: '2024-02-10',
    lastLogin: '2024-06-03 09:00',
    phone: '137****8901',
    rechargeRecords: [
      { id: 106, orderNo: 'R20240415002', amount: 3000, paymentMethod: '微信支付', pointsAdded: 3000, levelBefore: 2, levelAfter: 3, status: 'success', time: '2024-04-15 11:00' },
      { id: 107, orderNo: 'R20240101001', amount: 2000, paymentMethod: '微信支付', pointsAdded: 2000, levelBefore: 1, levelAfter: 2, status: 'success', time: '2024-01-01 12:00' },
    ],
    consumptionRecords: [
      { id: 206, orderNo: 'ORD20240603003', productInfo: 'Arturo Fuente OpusX', amount: 820, paymentMethod: '美团收银', pointsAdded: 820, levelBefore: 2, levelAfter: 3, orderStatus: 'completed', time: '2024-06-03 23:00', syncStatus: 'synced' },
    ],
    levelChangeRecords: [
      { id: 307, levelType: 'recharge', levelBefore: 2, levelAfter: 3, triggerType: '充值升级', triggerOrderNo: 'R20240415002', time: '2024-04-15 11:00' },
      { id: 308, levelType: 'consumption', levelBefore: 2, levelAfter: 3, triggerType: '消费升级', triggerOrderNo: 'ORD20240603003', time: '2024-06-03 23:00' },
    ],
  },
  {
    id: 4,
    nickname: '陈先生',
    avatar: null,
    rechargeLevel: 9,
    consumptionLevel: 8,
    rechargePoints: 38000,
    consumptionPoints: 31000,
    balance: 28600,
    totalRecharge: 68000,
    totalSpend: 68000,
    orderCount: 32,
    loginCount: 96,
    birthday: '1972-05-20',
    joinDate: '2023-06-01',
    lastLogin: '2024-06-02 22:10',
    phone: '136****5678',
    rechargeRecords: [
      { id: 108, orderNo: 'R20240501002', amount: 20000, paymentMethod: '微信支付', pointsAdded: 20000, levelBefore: 8, levelAfter: 9, status: 'success', time: '2024-05-01 09:00' },
      { id: 109, orderNo: 'R20240301001', amount: 10000, paymentMethod: '微信支付', pointsAdded: 10000, levelBefore: 7, levelAfter: 8, status: 'success', time: '2024-03-01 16:00' },
    ],
    consumptionRecords: [
      { id: 207, orderNo: 'ORD20240602002', productInfo: 'Padron 1964 Anniversary', amount: 3010, paymentMethod: '储值余额', pointsAdded: 3010, levelBefore: 7, levelAfter: 8, orderStatus: 'completed', time: '2024-06-02 18:00', syncStatus: 'synced' },
      { id: 208, orderNo: 'ORD20240515001', productInfo: 'Cohiba Behike 52 + 鸡尾酒', amount: 2100, paymentMethod: '美团收银', pointsAdded: 2100, levelBefore: 7, levelAfter: 7, orderStatus: 'completed', time: '2024-05-15 20:00', syncStatus: 'synced' },
    ],
    levelChangeRecords: [
      { id: 309, levelType: 'recharge', levelBefore: 8, levelAfter: 9, triggerType: '充值升级', triggerOrderNo: 'R20240501002', time: '2024-05-01 09:00' },
      { id: 310, levelType: 'consumption', levelBefore: 7, levelAfter: 8, triggerType: '消费升级', triggerOrderNo: 'ORD20240602002', time: '2024-06-02 18:00' },
    ],
  },
  {
    id: 5,
    nickname: '刘先生',
    avatar: null,
    rechargeLevel: 1,
    consumptionLevel: 1,
    rechargePoints: 0,
    consumptionPoints: 0,
    balance: 0,
    totalRecharge: 0,
    totalSpend: 0,
    orderCount: 1,
    loginCount: 3,
    birthday: null,
    joinDate: '2024-06-01',
    lastLogin: '2024-06-01 10:00',
    phone: null,
    rechargeRecords: [],
    consumptionRecords: [
      { id: 209, orderNo: 'ORD20240601001', productInfo: 'Padron 1964 Anniversary', amount: 0, paymentMethod: '美团收银', pointsAdded: 0, levelBefore: 1, levelAfter: 1, orderStatus: 'pending', time: '2024-06-01 10:15', syncStatus: 'pending' },
    ],
    levelChangeRecords: [],
  },
  {
    id: 6,
    nickname: '赵女士',
    avatar: null,
    rechargeLevel: 6,
    consumptionLevel: 5,
    rechargePoints: 5800,
    consumptionPoints: 5100,
    balance: 9800,
    totalRecharge: 18000,
    totalSpend: 15200,
    orderCount: 12,
    loginCount: 28,
    birthday: '1988-09-30',
    joinDate: '2023-11-15',
    lastLogin: '2024-06-03 12:45',
    phone: '135****3456',
    rechargeRecords: [
      { id: 110, orderNo: 'R20240525001', amount: 8000, paymentMethod: '微信支付', pointsAdded: 8000, levelBefore: 5, levelAfter: 6, status: 'success', time: '2024-05-25 17:00' },
      { id: 111, orderNo: 'R20240220001', amount: 5000, paymentMethod: '微信支付', pointsAdded: 5000, levelBefore: 4, levelAfter: 5, status: 'success', time: '2024-02-20 13:30' },
    ],
    consumptionRecords: [
      { id: 210, orderNo: 'ORD20240602003', productInfo: 'Romeo y Julieta Reserva Real', amount: 1560, paymentMethod: '储值余额', pointsAdded: 1560, levelBefore: 4, levelAfter: 5, orderStatus: 'completed', time: '2024-06-02 19:30', syncStatus: 'synced' },
    ],
    levelChangeRecords: [
      { id: 311, levelType: 'recharge', levelBefore: 5, levelAfter: 6, triggerType: '充值升级', triggerOrderNo: 'R20240525001', time: '2024-05-25 17:00' },
      { id: 312, levelType: 'consumption', levelBefore: 4, levelAfter: 5, triggerType: '消费升级', triggerOrderNo: 'ORD20240602003', time: '2024-06-02 19:30' },
    ],
  },
  {
    id: 7,
    nickname: '孙先生',
    avatar: null,
    rechargeLevel: 7,
    consumptionLevel: 8,
    rechargePoints: 6800,
    consumptionPoints: 7500,
    balance: 4200,
    totalRecharge: 12000,
    totalSpend: 32000,
    orderCount: 22,
    loginCount: 55,
    birthday: '1982-01-18',
    joinDate: '2023-08-20',
    lastLogin: '2024-06-03 08:15',
    phone: '134****7890',
    rechargeRecords: [
      { id: 112, orderNo: 'R20240601002', amount: 5000, paymentMethod: '微信支付', pointsAdded: 5000, levelBefore: 6, levelAfter: 7, status: 'success', time: '2024-06-01 17:30' },
      { id: 113, orderNo: 'R20240401001', amount: 7000, paymentMethod: '微信支付', pointsAdded: 7000, levelBefore: 5, levelAfter: 6, status: 'success', time: '2024-04-01 10:00' },
    ],
    consumptionRecords: [
      { id: 211, orderNo: 'ORD20240601003', productInfo: 'Montecristo No.2 + 鸡尾酒', amount: 2200, paymentMethod: '美团收银', pointsAdded: 2200, levelBefore: 7, levelAfter: 8, orderStatus: 'completed', time: '2024-06-01 21:00', syncStatus: 'synced' },
    ],
    levelChangeRecords: [
      { id: 313, levelType: 'recharge', levelBefore: 6, levelAfter: 7, triggerType: '充值升级', triggerOrderNo: 'R20240601002', time: '2024-06-01 17:30' },
      { id: 314, levelType: 'consumption', levelBefore: 7, levelAfter: 8, triggerType: '消费升级', triggerOrderNo: 'ORD20240601003', time: '2024-06-01 21:00' },
    ],
  },
]

export const mockRechargeLevelConfigs = [...defaultRechargeLevelConfig]
export const mockConsumptionLevelConfigs = [...defaultConsumptionLevelConfig]
