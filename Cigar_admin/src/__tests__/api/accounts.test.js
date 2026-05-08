import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import * as accountsApi from '../../api/accounts'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('accounts API', () => {
  describe('getAccounts', () => {
    it('应 GET /admin/accounts 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await accountsApi.getAccounts({ page: 1, pageSize: 10 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/accounts', { params: { page: 1, pageSize: 10 } })
    })
  })

  describe('getAccount', () => {
    it('应 GET /admin/accounts/:id', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await accountsApi.getAccount(3)
      expect(apiClient.get).toHaveBeenCalledWith('/admin/accounts/3')
    })
  })

  describe('createAccount', () => {
    it('应 POST /admin/accounts', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await accountsApi.createAccount({ username: 'new', password: '12345678', name: 'New' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/accounts', { username: 'new', password: '12345678', name: 'New' })
    })
  })

  describe('updateAccount', () => {
    it('应 PUT /admin/accounts/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await accountsApi.updateAccount(3, { name: 'Updated' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/accounts/3', { name: 'Updated' })
    })
  })

  describe('deleteAccount', () => {
    it('应 DELETE /admin/accounts/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await accountsApi.deleteAccount(3)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/accounts/3')
    })
  })

  describe('getLoginLogs', () => {
    it('应 GET /admin/login-logs 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await accountsApi.getLoginLogs({ page: 1, pageSize: 20 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/login-logs', { params: { page: 1, pageSize: 20 } })
    })
  })
})
