import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import * as sv from '../../api/storedvalue'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  genIdempotencyKey: vi.fn(() => 'idem-key'),
}))

describe('storedvalue API', () => {
  describe('Recharge Tiers', () => {
    it('getRechargeTiers 应 GET /admin/storedvalue/tiers', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await sv.getRechargeTiers()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/storedvalue/tiers', { params: undefined })
    })

    it('createRechargeTier 应 POST /admin/storedvalue/tiers', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await sv.createRechargeTier({ amountCents: 10000, bonusCents: 1000 })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/storedvalue/tiers', { amountCents: 10000, bonusCents: 1000 })
    })

    it('updateRechargeTier 应 PUT /admin/storedvalue/tiers/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await sv.updateRechargeTier(1, { amountCents: 20000 })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/storedvalue/tiers/1', { amountCents: 20000 })
    })

    it('deleteRechargeTier 应 DELETE /admin/storedvalue/tiers/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await sv.deleteRechargeTier(1)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/storedvalue/tiers/1')
    })
  })

  describe('Level Configs', () => {
    it('getLevelConfigs 应 GET /admin/storedvalue/level-config 带 type', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await sv.getLevelConfigs('recharge')
      expect(apiClient.get).toHaveBeenCalledWith('/admin/storedvalue/level-config', { params: { type: 'recharge' } })
    })

    it('updateLevelConfig 应 PUT /admin/storedvalue/level-config/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await sv.updateLevelConfig(2, { minPoints: 100 })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/storedvalue/level-config/2', { minPoints: 100 })
    })

    it('recalculateLevels 应 POST /admin/storedvalue/level-config/recalculate', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await sv.recalculateLevels('recharge')
      expect(apiClient.post).toHaveBeenCalledWith('/admin/storedvalue/level-config/recalculate', { levelType: 'recharge' })
    })
  })

  describe('Transactions', () => {
    it('getTransactions 应 GET /admin/storedvalue/transactions', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await sv.getTransactions({ page: 1, pageSize: 20 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/storedvalue/transactions', { params: { page: 1, pageSize: 20 } })
    })

    it('adjustBalance 应 POST /admin/storedvalue/transactions/adjust 带幂等键', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await sv.adjustBalance({ userId: 1, amountCents: 5000, reason: '补偿' })
      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/storedvalue/transactions/adjust',
        { userId: 1, amountCents: 5000, reason: '补偿' },
        { idempotencyKey: 'idem-key' }
      )
    })

    it('getRechargeOrders 应 GET /admin/storedvalue/recharge-orders', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await sv.getRechargeOrders({ page: 1 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/storedvalue/recharge-orders', { params: { page: 1 } })
    })
  })
})
