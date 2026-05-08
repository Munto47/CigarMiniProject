import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import * as reviewsApi from '../../api/reviews'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}))

describe('reviews API', () => {
  describe('Reviews', () => {
    it('getReviews 应 GET /admin/reviews', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await reviewsApi.getReviews({ page: 1, pageSize: 20 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/reviews', { params: { page: 1, pageSize: 20 } })
    })

    it('moderateReview 应 PUT /admin/reviews/:id/moderate', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await reviewsApi.moderateReview(5, { status: 'hidden' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/reviews/5/moderate', { status: 'hidden' })
    })

    it('deleteReview 应 DELETE /admin/reviews/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await reviewsApi.deleteReview(5)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/reviews/5')
    })
  })

  describe('Sensitive Words', () => {
    it('getSensitiveWords 应 GET /admin/reviews/sensitive-words', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await reviewsApi.getSensitiveWords({ pageSize: 500 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/reviews/sensitive-words', { params: { pageSize: 500 } })
    })

    it('createSensitiveWord 应 POST /admin/reviews/sensitive-words', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await reviewsApi.createSensitiveWord({ word: 'badword' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/reviews/sensitive-words', { word: 'badword' })
    })

    it('deleteSensitiveWord 应 DELETE /admin/reviews/sensitive-words/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await reviewsApi.deleteSensitiveWord(3)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/reviews/sensitive-words/3')
    })
  })
})
