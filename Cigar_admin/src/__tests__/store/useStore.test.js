import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../../store/useStore'

// Reset store state between tests
beforeEach(() => {
  useStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    siderCollapsed: false,
    pendingOrders: 0,
  })
  localStorage.clear()
})

describe('useStore', () => {
  describe('login', () => {
    it('应将 user/tokens 存储到 localStorage 并更新 state', () => {
      const userInfo = { id: 1, username: 'admin', role: 'super_admin' }
      const accessToken = 'access-token-123'
      const refreshToken = 'refresh-token-456'

      useStore.getState().login(userInfo, accessToken, refreshToken)

      const state = useStore.getState()
      expect(state.user).toEqual(userInfo)
      expect(state.accessToken).toBe(accessToken)
      expect(state.refreshToken).toBe(refreshToken)

      expect(localStorage.getItem('admin_user')).toBe(JSON.stringify(userInfo))
      expect(localStorage.getItem('access_token')).toBe(accessToken)
      expect(localStorage.getItem('refresh_token')).toBe(refreshToken)
    })
  })

  describe('logout', () => {
    it('应清除 localStorage 并重置 state', () => {
      // 先登录
      useStore.getState().login(
        { id: 1, username: 'admin' },
        'at',
        'rt'
      )
      localStorage.setItem('must_change_password', 'true')

      useStore.getState().logout()

      const state = useStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(localStorage.getItem('admin_user')).toBeNull()
      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(localStorage.getItem('must_change_password')).toBeNull()
    })
  })

  describe('updateTokens', () => {
    it('应更新 accessToken 到 localStorage 和 state', () => {
      useStore.getState().updateTokens('new-at', null)

      const state = useStore.getState()
      expect(state.accessToken).toBe('new-at')
      expect(localStorage.getItem('access_token')).toBe('new-at')
    })

    it('传入 refreshToken 时应同步更新', () => {
      useStore.getState().updateTokens('new-at', 'new-rt')

      const state = useStore.getState()
      expect(state.accessToken).toBe('new-at')
      expect(state.refreshToken).toBe('new-rt')
      expect(localStorage.getItem('refresh_token')).toBe('new-rt')
    })
  })

  describe('setSiderCollapsed', () => {
    it('应切换侧边栏折叠状态', () => {
      expect(useStore.getState().siderCollapsed).toBe(false)

      useStore.getState().setSiderCollapsed(true)
      expect(useStore.getState().siderCollapsed).toBe(true)

      useStore.getState().setSiderCollapsed(false)
      expect(useStore.getState().siderCollapsed).toBe(false)
    })
  })

  describe('setPendingOrders', () => {
    it('应更新待处理订单数', () => {
      expect(useStore.getState().pendingOrders).toBe(0)

      useStore.getState().setPendingOrders(5)
      expect(useStore.getState().pendingOrders).toBe(5)

      useStore.getState().setPendingOrders(0)
      expect(useStore.getState().pendingOrders).toBe(0)
    })
  })

  describe('初始化', () => {
    it('应从 localStorage 恢复已保存的 user', () => {
      const userInfo = { id: 2, username: 'saved-user' }
      localStorage.setItem('admin_user', JSON.stringify(userInfo))
      localStorage.setItem('access_token', 'saved-at')
      localStorage.setItem('refresh_token', 'saved-rt')

      // 重新创建 store（模拟应用重启）
      const { create } = require('zustand')
      const tempStore = create((set) => ({
        user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
        accessToken: localStorage.getItem('access_token') || null,
        refreshToken: localStorage.getItem('refresh_token') || null,
      }))

      expect(tempStore.getState().user).toEqual(userInfo)
      expect(tempStore.getState().accessToken).toBe('saved-at')
      expect(tempStore.getState().refreshToken).toBe('saved-rt')
    })
  })
})
