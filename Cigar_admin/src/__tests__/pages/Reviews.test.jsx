import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReviewsPage from '../../pages/reviews'

vi.mock('../../api/reviews', () => ({
  getReviews: vi.fn(),
  moderateReview: vi.fn(),
  deleteReview: vi.fn(),
  getSensitiveWords: vi.fn(),
  createSensitiveWord: vi.fn(),
  deleteSensitiveWord: vi.fn(),
}))

import { getReviews, getSensitiveWords } from '../../api/reviews'

const mockReviews = {
  list: [
    { id: 1, userName: '张三', rating: 5, content: '很棒', status: 'visible', createdAt: '2026-05-01' },
    { id: 2, userName: '李四', rating: 2, content: '一般', status: 'hidden', createdAt: '2026-05-02' },
  ],
  total: 2,
}

const mockWords = { list: [{ id: 1, word: 'badword' }, { id: 2, word: 'spam' }] }

describe('ReviewsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><ReviewsPage /></MemoryRouter>)
  }

  it('应渲染页面标题', async () => {
    getReviews.mockResolvedValue({ data: { code: 0, data: mockReviews } })
    getSensitiveWords.mockResolvedValue({ data: { code: 0, data: mockWords } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('评价管理')).toBeTruthy()
    })
  })

  it('应渲染3个Tab', async () => {
    getReviews.mockResolvedValue({ data: { code: 0, data: mockReviews } })
    getSensitiveWords.mockResolvedValue({ data: { code: 0, data: mockWords } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('评分总览')).toBeTruthy()
      expect(screen.getByText('评论管理')).toBeTruthy()
      expect(screen.getByText('敏感词库')).toBeTruthy()
    })
  })

  it('页面渲染不崩溃', () => {
    const { container } = renderPage()
    expect(container).toBeTruthy()
  })

  it('API 失败时不应崩溃', async () => {
    getReviews.mockRejectedValue(new Error('fail'))
    getSensitiveWords.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
