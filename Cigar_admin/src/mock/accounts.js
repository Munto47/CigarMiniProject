export const mockAccounts = [
  {
    id: 1, username: 'admin', name: '超级管理员', role: 'super',
    status: 'active', lastLogin: '2024-06-03 14:22', createdAt: '2023-01-01',
    permissions: ['all'],
  },
  {
    id: 2, username: 'product_mgr', name: '李经理', role: 'product',
    status: 'active', lastLogin: '2024-06-03 10:15', createdAt: '2023-06-01',
    permissions: ['products', 'library'],
  },
  {
    id: 3, username: 'order_mgr', name: '赵主管', role: 'order',
    status: 'active', lastLogin: '2024-06-02 18:30', createdAt: '2023-09-01',
    permissions: ['orders'],
  },
  {
    id: 4, username: 'member_mgr', name: '陈专员', role: 'member',
    status: 'disabled', lastLogin: '2024-05-20 09:00', createdAt: '2024-01-15',
    permissions: ['members', 'storedvalue'],
  },
]

export const mockLoginLogs = [
  { id: 1, username: 'admin', ip: '192.168.1.100', time: '2024-06-03 14:22', result: 'success' },
  { id: 2, username: 'product_mgr', ip: '192.168.1.102', time: '2024-06-03 10:15', result: 'success' },
  { id: 3, username: 'admin', ip: '192.168.1.100', time: '2024-06-02 22:00', result: 'success' },
  { id: 4, username: 'unknown', ip: '10.0.0.55', time: '2024-06-02 03:14', result: 'failed' },
  { id: 5, username: 'order_mgr', ip: '192.168.1.105', time: '2024-06-02 18:30', result: 'success' },
]

export const roleMap = {
  super: { label: '超级管理员', color: '#C9A84C' },
  product: { label: '商品管理员', color: '#4C7AC9' },
  order: { label: '订单管理员', color: '#4CAF7A' },
  member: { label: '会员管理员', color: '#9E9484' },
}
