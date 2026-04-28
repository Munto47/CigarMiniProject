import { create } from 'zustand'

const useStore = create((set) => ({
  // 登录态
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  login: (userInfo) => {
    localStorage.setItem('admin_user', JSON.stringify(userInfo))
    set({ user: userInfo })
  },
  logout: () => {
    localStorage.removeItem('admin_user')
    set({ user: null })
  },

  // 侧边栏折叠
  siderCollapsed: false,
  setSiderCollapsed: (v) => set({ siderCollapsed: v }),

  // 全局通知数（示例）
  pendingOrders: 3,
  setPendingOrders: (n) => set({ pendingOrders: n }),
}))

export default useStore
