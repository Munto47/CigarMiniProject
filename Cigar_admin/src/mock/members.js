export const mockMembers = [
  {
    id: 1, nickname: '林先生', avatar: null,
    level: 'gold', balance: 12800, points: 3280,
    totalSpend: 24600, orderCount: 18, loginCount: 42,
    birthday: '1985-03-15', joinDate: '2023-09-01',
    lastLogin: '2024-06-03',
    records: [
      { type: 'recharge', amount: 5000, desc: '充值', time: '2024-06-01' },
      { type: 'consume', amount: -1100, desc: '订单 ORD20240603001', time: '2024-06-03' },
      { type: 'recharge', amount: 10000, desc: '充值', time: '2024-05-10' },
    ],
  },
  {
    id: 2, nickname: '张女士', avatar: null,
    level: 'silver', balance: 3200, points: 1560,
    totalSpend: 8900, orderCount: 7, loginCount: 18,
    birthday: '1990-07-22', joinDate: '2024-01-15',
    lastLogin: '2024-06-03',
    records: [
      { type: 'consume', amount: -1315, desc: '订单 ORD20240603002', time: '2024-06-03' },
      { type: 'recharge', amount: 5000, desc: '充值', time: '2024-05-20' },
    ],
  },
  {
    id: 3, nickname: '王先生', avatar: null,
    level: 'silver', balance: 1800, points: 820,
    totalSpend: 5600, orderCount: 5, loginCount: 11,
    birthday: '1978-11-08', joinDate: '2024-02-10',
    lastLogin: '2024-06-03',
    records: [
      { type: 'consume', amount: -820, desc: '订单 ORD20240603003', time: '2024-06-03' },
      { type: 'recharge', amount: 3000, desc: '充值', time: '2024-04-15' },
    ],
  },
  {
    id: 4, nickname: '陈先生', avatar: null,
    level: 'gold', balance: 28600, points: 6800,
    totalSpend: 68000, orderCount: 32, loginCount: 96,
    birthday: '1972-05-20', joinDate: '2023-06-01',
    lastLogin: '2024-06-02',
    records: [
      { type: 'consume', amount: -3010, desc: '订单 ORD20240602002', time: '2024-06-02' },
      { type: 'recharge', amount: 20000, desc: '充值', time: '2024-05-01' },
    ],
  },
  {
    id: 5, nickname: '刘先生', avatar: null,
    level: 'normal', balance: 0, points: 200,
    totalSpend: 0, orderCount: 1, loginCount: 3,
    birthday: null, joinDate: '2024-06-01',
    lastLogin: '2024-06-01',
    records: [],
  },
]

export const memberLevelMap = {
  normal: { label: '普通会员', color: '#9E9484' },
  silver: { label: '银卡会员', color: '#A0A0B0' },
  gold: { label: '金卡会员', color: '#C9A84C' },
}
