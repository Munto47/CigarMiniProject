import { create } from 'zustand'

function getStoredUser() {
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const useStore = create((set) => ({
  // 登录态
  user: getStoredUser(),
  accessToken: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,

  login: (userInfo, accessToken, refreshToken) => {
    localStorage.setItem('admin_user', JSON.stringify(userInfo))
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    set({ user: userInfo, accessToken, refreshToken })
  },

  logout: () => {
    localStorage.removeItem('admin_user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('must_change_password')
    set({ user: null, accessToken: null, refreshToken: null })
  },

  updateTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    set({ accessToken, refreshToken })
  },

  // 侧边栏折叠
  siderCollapsed: false,
  setSiderCollapsed: (v) => set({ siderCollapsed: v }),

  // 全局通知数
  pendingOrders: 0,
  setPendingOrders: (n) => set({ pendingOrders: n }),
}))

export default useStore
