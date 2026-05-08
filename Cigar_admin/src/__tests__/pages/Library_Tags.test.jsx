import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TagsPage from '../../pages/library/tags'

vi.mock('../../api/library', () => ({
  getFlavorTags: vi.fn(),
  createFlavorTag: vi.fn(),
  updateFlavorTag: vi.fn(),
  deleteFlavorTag: vi.fn(),
}))

import { getFlavorTags } from '../../api/library'

const mockData = { list: [{ id: 1, name: '木质', category: '木质系', weight: 0.8 }], total: 1 }

describe('TagsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><TagsPage /></MemoryRouter>)
  }

  it('应调用 getFlavorTags API', async () => {
    getFlavorTags.mockResolvedValue({ data: { code: 0, data: mockData } })
    renderPage()
    await waitFor(() => {
      expect(getFlavorTags).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getFlavorTags.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
