import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InstorePage from '../../pages/library/instore'

vi.mock('../../api/library', () => ({
  getInstoreCigars: vi.fn(),
  createInstoreCigar: vi.fn(),
  updateInstoreCigar: vi.fn(),
  deleteInstoreCigar: vi.fn(),
  syncInstore: vi.fn(),
}))

import { getInstoreCigars } from '../../api/library'

const mockData = { list: [{ id: 1, name: '高希霸', brand: 'Cohiba', stock: 50 }], total: 1 }

describe('InstorePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><InstorePage /></MemoryRouter>)
  }

  it('应调用 getInstoreCigars API', async () => {
    getInstoreCigars.mockResolvedValue({ data: { code: 0, data: mockData } })
    renderPage()
    await waitFor(() => {
      expect(getInstoreCigars).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getInstoreCigars.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
