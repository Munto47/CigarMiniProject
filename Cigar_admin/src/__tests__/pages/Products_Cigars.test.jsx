import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CigarsPage from '../../pages/products/cigars'

vi.mock('../../api/products', () => ({
  getCigars: vi.fn(),
  createCigar: vi.fn(),
  updateCigar: vi.fn(),
  deleteCigar: vi.fn(),
}))

import { getCigars } from '../../api/products'

const mockCigars = { list: [{ id: 1, name: '高希霸', brand: 'Cohiba', stock: 50 }], total: 1 }

describe('CigarsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><CigarsPage /></MemoryRouter>)
  }

  it('应调用 getCigars API', async () => {
    getCigars.mockResolvedValue({ data: { code: 0, data: mockCigars } })
    renderPage()
    await waitFor(() => {
      expect(getCigars).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getCigars.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
