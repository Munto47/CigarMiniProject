import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import * as statsApi from '../../api/statistics'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('statistics API', () => {
  describe('getStatisticsSales', () => {
    it('应 GET /admin/statistics/sales 带日期参数', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await statsApi.getStatisticsSales({ startDate: '2026-01-01', endDate: '2026-01-31' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/statistics/sales', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' },
      })
    })
  })

  describe('getStatisticsCategories', () => {
    it('应 GET /admin/statistics/categories', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await statsApi.getStatisticsCategories({ startDate: '2026-01-01', endDate: '2026-01-31' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/statistics/categories', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' },
      })
    })
  })

  describe('getStatisticsUsers', () => {
    it('应 GET /admin/statistics/users', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await statsApi.getStatisticsUsers({ startDate: '2026-01-01', endDate: '2026-01-31' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/statistics/users', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' },
      })
    })
  })

  describe('getStatisticsStoredValue', () => {
    it('应 GET /admin/statistics/storedvalue', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await statsApi.getStatisticsStoredValue({ startDate: '2026-01-01', endDate: '2026-01-31' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/statistics/storedvalue', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' },
      })
    })
  })

  describe('exportStatistics', () => {
    it('应 GET /admin/statistics/export', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0 } })
      await statsApi.exportStatistics({ startDate: '2026-01-01', endDate: '2026-01-31' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/statistics/export', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' },
      })
    })
  })
})
