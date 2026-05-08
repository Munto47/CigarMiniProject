import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import { getMembers, getMemberDetail, getMemberStats, getLevelConfig } from '../../api/members'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('members API', () => {
  describe('getMembers', () => {
    it('应 GET /admin/members 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: { list: [], total: 0 } } })
      await getMembers({ page: 1, keyword: 'test', rechargeLevel: 3 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/members', {
        params: { page: 1, keyword: 'test', rechargeLevel: 3 },
      })
    })
  })

  describe('getMemberDetail', () => {
    it('应 GET /admin/members/:id', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getMemberDetail(10)
      expect(apiClient.get).toHaveBeenCalledWith('/admin/members/10')
    })
  })

  describe('getMemberStats', () => {
    it('应 GET /admin/members/stats', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getMemberStats()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/members/stats')
    })
  })

  describe('getLevelConfig', () => {
    it('应 GET /storedvalue/level-config/:type', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getLevelConfig('recharge')
      expect(apiClient.get).toHaveBeenCalledWith('/storedvalue/level-config/recharge')
    })
  })
})
