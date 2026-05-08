import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StoredValuePage from '../../pages/storedvalue'

vi.mock('../../api/storedvalue', () => ({
  getRechargeTiers: vi.fn(),
  createRechargeTier: vi.fn(),
  updateRechargeTier: vi.fn(),
  deleteRechargeTier: vi.fn(),
  getLevelConfigs: vi.fn(),
  updateLevelConfig: vi.fn(),
  recalculateLevels: vi.fn(),
  getTransactions: vi.fn(),
  adjustBalance: vi.fn(),
  getRechargeOrders: vi.fn(),
}))

vi.mock('../../api/settings', () => ({
  getSettings: vi.fn(),
  updateSetting: vi.fn(),
}))

import { getRechargeTiers, getLevelConfigs, getTransactions } from '../../api/storedvalue'
import { getSettings } from '../../api/settings'

describe('StoredValuePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><StoredValuePage /></MemoryRouter>)
  }

  it('应调用多个 API 加载数据', async () => {
    getRechargeTiers.mockResolvedValue({ data: { code: 0, data: [] } })
    getLevelConfigs.mockResolvedValue({ data: { code: 0, data: [] } })
    getTransactions.mockResolvedValue({ data: { code: 0, data: { list: [], total: 0 } } })
    getSettings.mockResolvedValue({ data: { code: 0, data: {} } })
    renderPage()
    await waitFor(() => {
      expect(getRechargeTiers).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getRechargeTiers.mockRejectedValue(new Error('fail'))
    getLevelConfigs.mockRejectedValue(new Error('fail'))
    getTransactions.mockRejectedValue(new Error('fail'))
    getSettings.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
