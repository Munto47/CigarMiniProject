import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import { getPosters, getPosterTemplate, updatePosterTemplate } from '../../api/posters'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('posters API', () => {
  describe('getPosters', () => {
    it('应 GET /admin/posters 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await getPosters({ page: 1, pageSize: 20 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/posters', { params: { page: 1, pageSize: 20 } })
    })
  })

  describe('getPosterTemplate', () => {
    it('应 GET /admin/posters/template', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await getPosterTemplate()
      expect(apiClient.get).toHaveBeenCalledWith('/admin/posters/template')
    })
  })

  describe('updatePosterTemplate', () => {
    it('应 PUT /admin/posters/template', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await updatePosterTemplate({ logoUrl: 'http://...' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/posters/template', { logoUrl: 'http://...' })
    })
  })
})
