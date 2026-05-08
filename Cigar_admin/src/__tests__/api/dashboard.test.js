import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import { getOverview, getSalesTrend, getRecentOrders, getTopProducts } from '../../api/dashboard'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('dashboard API', () => {
  describe('getOverview', () => {
    it('应 GET /admin/dashboard/overview', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getOverview()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/overview')
    })
  })

  describe('getSalesTrend', () => {
    it('应 GET /admin/dashboard/sales-trend 默认 days=7', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getSalesTrend()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/sales-trend', { params: { days: 7 } })
    })

    it('应支持自定义 days 参数', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getSalesTrend(30)
      expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/sales-trend', { params: { days: 30 } })
    })
  })

  describe('getRecentOrders', () => {
    it('应 GET /admin/dashboard/recent-orders 默认 limit=10', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getRecentOrders()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/recent-orders', { params: { limit: 10 } })
    })
  })

  describe('getTopProducts', () => {
    it('应 GET /admin/dashboard/top-products 默认 limit=10', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getTopProducts()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/top-products', { params: { limit: 10 } })
    })
  })
})
