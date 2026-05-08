import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import { adminLogin, refreshToken, changePassword, wechatLogin } from '../../api/auth'

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('auth API', () => {
  describe('adminLogin', () => {
    it('应 POST /admin/login 并传递 username 和 password', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0, data: { accessToken: 'at' } } })
      await adminLogin('admin', 'pass123')
      expect(apiClient.post).toHaveBeenCalledWith('/admin/login', { username: 'admin', password: 'pass123' })
    })
  })

  describe('refreshToken', () => {
    it('应 POST /auth/refresh 并传递 refreshToken', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0, data: {} } })
      await refreshToken('rt-123')
      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'rt-123' })
    })
  })

  describe('changePassword', () => {
    it('应 POST /admin/change-password 并传递新旧密码', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await changePassword('old', 'new')
      expect(apiClient.post).toHaveBeenCalledWith('/admin/change-password', { oldPassword: 'old', newPassword: 'new' })
    })
  })

  describe('wechatLogin', () => {
    it('应 POST /auth/wechat-login 并传递 code 和 userInfo', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0, data: {} } })
      await wechatLogin('wx-code', { nickName: 'test' })
      expect(apiClient.post).toHaveBeenCalledWith('/auth/wechat-login', { code: 'wx-code', userInfo: { nickName: 'test' } })
    })
  })
})
