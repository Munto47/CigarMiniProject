import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PostersPage from '../../pages/posters'

vi.mock('../../api/posters', () => ({
  getPosters: vi.fn(),
  getPosterTemplate: vi.fn(),
  updatePosterTemplate: vi.fn(),
}))

vi.mock('../../api/upload', () => ({
  uploadImage: vi.fn(),
}))

import { getPosters, getPosterTemplate } from '../../api/posters'

describe('PostersPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><PostersPage /></MemoryRouter>)
  }

  it('应渲染页面而不崩溃', () => {
    const { container } = renderPage()
    expect(container).toBeTruthy()
  })

  it('API mock 设置正确，页面不崩溃', () => {
    getPosters.mockResolvedValue({ data: { code: 0, data: { list: [], total: 0 } } })
    getPosterTemplate.mockResolvedValue({ data: { code: 0, data: {} } })
    const { container } = renderPage()
    expect(container).toBeTruthy()
  })
})
