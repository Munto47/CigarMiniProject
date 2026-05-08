import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import { getSettings, updateSetting, getOperationLogs, testMeituanConnection, getStoreInfo } from '../../api/settings'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}))

describe('settings API', () => {
  describe('getSettings', () => {
    it('应 GET /admin/settings', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getSettings()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings')
    })
  })

  describe('updateSetting', () => {
    it('应 PUT /admin/settings/:key', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await updateSetting('basic', { clubName: 'Test' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/settings/basic', { clubName: 'Test' })
    })
  })

  describe('getOperationLogs', () => {
    it('应 GET /admin/settings/logs 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getOperationLogs({ page: 1, pageSize: 20 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/logs', { params: { page: 1, pageSize: 20 } })
    })
  })

  describe('testMeituanConnection', () => {
    it('应 POST /admin/settings/meituan/test', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0, data: { ok: true } } })
      await testMeituanConnection()
      expect(apiClient.post).toHaveBeenCalledWith('/admin/settings/meituan/test')
    })
  })

  describe('getStoreInfo', () => {
    it('应 GET /admin/settings/public/store-info', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getStoreInfo()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/public/store-info')
    })
  })
})
