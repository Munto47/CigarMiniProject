export const mockOrders = [
  {
    id: 'ORD20240603001', userId: 1, userName: '林先生',
    items: [
      { cigarId: 1, name: 'Cohiba Behike 52', spec: '单支', qty: 1, price: 1280, memberPrice: 1100 },
    ],
    total: 1280, memberDiscount: 180, actualPay: 1100,
    payMethod: 'balance', status: 'completed',
    pickupTime: '2024-06-03 19:00', orderTime: '2024-06-03 14:22',
    evaluated: true,
  },
  {
    id: 'ORD20240603002', userId: 2, userName: '张女士',
    items: [
      { cigarId: 2, name: 'Davidoff Winston Churchill', spec: '单支', qty: 2, price: 680, memberPrice: 580 },
      { drinkId: 1, name: '麦卡伦12年单一麦芽威士忌', spec: '标准', qty: 1, price: 180, memberPrice: 155 },
    ],
    total: 1540, memberDiscount: 225, actualPay: 1315,
    payMethod: 'meituan', status: 'settling',
    pickupTime: '2024-06-03 20:00', orderTime: '2024-06-03 16:45',
    evaluated: false,
  },
  {
    id: 'ORD20240603003', userId: 3, userName: '王先生',
    items: [
      { cigarId: 3, name: 'Arturo Fuente OpusX', spec: '单支', qty: 1, price: 960, memberPrice: 820 },
    ],
    total: 960, memberDiscount: 140, actualPay: 820,
    payMethod: 'balance', status: 'pending',
    pickupTime: '2024-06-03 21:00', orderTime: '2024-06-03 17:30',
    evaluated: false,
  },
  {
    id: 'ORD20240602001', userId: 1, userName: '林先生',
    items: [
      { cigarId: 4, name: 'Montecristo No.2', spec: '单支', qty: 2, price: 580, memberPrice: 490 },
    ],
    total: 1160, memberDiscount: 180, actualPay: 980,
    payMethod: 'balance', status: 'completed',
    pickupTime: '2024-06-02 19:30', orderTime: '2024-06-02 15:10',
    evaluated: true,
  },
  {
    id: 'ORD20240602002', userId: 4, userName: '陈先生',
    items: [
      { cigarId: 5, name: 'Padron 1964 Anniversary', spec: '礼盒', qty: 1, price: 3200, memberPrice: 2750 },
      { drinkId: 2, name: '格兰菲迪15年', spec: '标准', qty: 2, price: 150, memberPrice: 130 },
    ],
    total: 3500, memberDiscount: 710, actualPay: 3010,
    payMethod: 'balance', status: 'completed',
    pickupTime: '2024-06-02 18:00', orderTime: '2024-06-02 11:20',
    evaluated: false,
  },
  {
    id: 'ORD20240601001', userId: 5, userName: '刘先生',
    items: [
      { cigarId: 1, name: 'Cohiba Behike 52', spec: '单支', qty: 1, price: 1280, memberPrice: 1100 },
      { drinkId: 3, name: '古巴自由', spec: '标准', qty: 2, price: 68, memberPrice: 58 },
    ],
    total: 1416, memberDiscount: 232, actualPay: 1216,
    payMethod: 'meituan', status: 'cancelled',
    pickupTime: '2024-06-01 19:00', orderTime: '2024-06-01 14:00',
    evaluated: false,
  },
]

export const orderStatusMap = {
  pending: { label: '待支付', color: 'warning' },
  settling: { label: '待结算', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
}
