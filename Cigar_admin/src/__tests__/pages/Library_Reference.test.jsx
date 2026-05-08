import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReferencePage from '../../pages/library/reference'

vi.mock('../../api/library', () => ({
  getReferenceCigars: vi.fn(),
  createReferenceCigar: vi.fn(),
  updateReferenceCigar: vi.fn(),
  deleteReferenceCigar: vi.fn(),
}))

import { getReferenceCigars } from '../../api/library'

const mockData = { list: [{ id: 1, name: 'Montecristo No.2', brand: 'Montecristo' }], total: 1 }

describe('ReferencePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><ReferencePage /></MemoryRouter>)
  }

  it('应调用 getReferenceCigars API', async () => {
    getReferenceCigars.mockResolvedValue({ data: { code: 0, data: mockData } })
    renderPage()
    await waitFor(() => {
      expect(getReferenceCigars).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getReferenceCigars.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
