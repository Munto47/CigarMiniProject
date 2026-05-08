import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StatisticsPage from '../../pages/statistics'

vi.mock('../../api/statistics', () => ({
  getStatisticsSales: vi.fn(),
  getStatisticsCategories: vi.fn(),
  getStatisticsUsers: vi.fn(),
  getStatisticsStoredValue: vi.fn(),
  exportStatistics: vi.fn(),
}))

import { getStatisticsSales } from '../../api/statistics'

describe('StatisticsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><StatisticsPage /></MemoryRouter>)
  }

  it('应调用 getStatisticsSales API', async () => {
    getStatisticsSales.mockResolvedValue({ data: { code: 0, data: [] } })
    renderPage()
    await waitFor(() => {
      expect(getStatisticsSales).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getStatisticsSales.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
