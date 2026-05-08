import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient, { genIdempotencyKey } from '../../api/client'
import { createOrder, getOrders, getOrderDetail, updateOrderStatus, refundOrder, syncMeituan } from '../../api/orders'

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
  genIdempotencyKey: vi.fn(() => 'mock-uuid-key'),
}))

describe('orders API', () => {
  describe('createOrder', () => {
    it('应 POST /orders 并附带幂等键', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await createOrder({ items: [] })
      expect(apiClient.post).toHaveBeenCalledWith(
        '/orders', { items: [] }, { idempotencyKey: 'mock-uuid-key' }
      )
    })
  })

  describe('getOrders', () => {
    it('应 GET /admin/orders 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getOrders({ page: 1, status: 'pending' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/orders', { params: { page: 1, status: 'pending' } })
    })
  })

  describe('getOrderDetail', () => {
    it('应 GET /admin/orders/:id', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getOrderDetail(100)
      expect(apiClient.get).toHaveBeenCalledWith('/admin/orders/100')
    })
  })

  describe('updateOrderStatus', () => {
    it('应 PATCH /admin/orders/:id/status', async () => {
      apiClient.patch.mockResolvedValue({ data: { code: 0 } })
      await updateOrderStatus(1, { status: 'completed' })
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/orders/1/status', { status: 'completed' })
    })
  })

  describe('refundOrder', () => {
    it('应 POST /admin/orders/:id/refund 并附带幂等键', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await refundOrder(1, { amountCents: 5000 })
      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/orders/1/refund', { amountCents: 5000 }, { idempotencyKey: 'mock-uuid-key' }
      )
    })
  })

  describe('syncMeituan', () => {
    it('应 POST /admin/orders/sync-meituan', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await syncMeituan()
      expect(apiClient.post).toHaveBeenCalledWith('/admin/orders/sync-meituan')
    })
  })
})
