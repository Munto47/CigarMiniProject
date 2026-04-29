export const mockRechargeTiers = [
  { id: 1, amount: 1000, bonus: 0, label: '¥1000', active: true },
  { id: 2, amount: 2000, bonus: 100, label: '¥2000 送¥100', active: true },
  { id: 3, amount: 5000, bonus: 300, label: '¥5000 送¥300', active: true },
  { id: 4, amount: 10000, bonus: 800, label: '¥10000 送¥800', active: true },
  { id: 5, amount: 20000, bonus: 2000, label: '¥20000 送¥2000', active: false },
]

export const mockStoredValueConfig = {
  discountRate: 0.85,
  birthdayReminderDays: 3,
  newArrivalNotify: true,
  discountLabel: '85折',
}

export const mockTransactions = [
  { id: 1, userId: 1, userName: '林先生', type: 'recharge', amount: 5000, balance: 12800, desc: '微信支付充值', time: '2024-06-01 10:22' },
  { id: 2, userId: 1, userName: '林先生', type: 'consume', amount: -1100, balance: 11700, desc: '订单 ORD20240603001', time: '2024-06-03 14:22' },
  { id: 3, userId: 4, userName: '陈先生', type: 'recharge', amount: 20000, balance: 28600, desc: '微信支付充值', time: '2024-05-01 09:00' },
  { id: 4, userId: 4, userName: '陈先生', type: 'consume', amount: -3010, balance: 25590, desc: '订单 ORD20240602002', time: '2024-06-02 18:00' },
  { id: 5, userId: 2, userName: '张女士', type: 'recharge', amount: 5000, balance: 3200, desc: '微信支付充值', time: '2024-05-20 15:30' },
  { id: 6, userId: 2, userName: '张女士', type: 'consume', amount: -1315, balance: 1885, desc: '订单 ORD20240603002（美团）', time: '2024-06-03 16:45' },
  { id: 7, userId: 3, userName: '王先生', type: 'recharge', amount: 3000, balance: 1800, desc: '微信支付充值', time: '2024-04-15 11:00' },
  { id: 8, userId: 3, userName: '王先生', type: 'adjust', amount: 200, balance: 2000, desc: '管理员手动调整-补偿', time: '2024-05-01 10:00' },
]

// 等级配置日志
export const mockLevelConfigLogs = [
  { id: 1, levelType: 'recharge', level: 5, oldMin: 4000, oldMax: 4999, newMin: 4000, newMax: 5999, operator: 'admin', time: '2024-05-15 16:30' },
  { id: 2, levelType: 'consumption', level: 3, oldMin: 2000, oldMax: 2999, newMin: 2000, newMax: 3499, operator: 'admin', time: '2024-05-15 16:45' },
]
