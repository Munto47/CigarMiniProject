import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import * as lib from '../../api/library'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('library API', () => {
  describe('In-store Cigars', () => {
    it('getInstoreCigars 应 GET /admin/library/instore', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await lib.getInstoreCigars({ page: 1, keyword: 'test' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/library/instore', { params: { page: 1, keyword: 'test' } })
    })

    it('createInstoreCigar 应 POST /admin/library/instore', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await lib.createInstoreCigar({ name: 'Cigar' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/library/instore', { name: 'Cigar' })
    })

    it('updateInstoreCigar 应 PUT /admin/library/instore/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await lib.updateInstoreCigar(1, { name: 'U' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/library/instore/1', { name: 'U' })
    })

    it('deleteInstoreCigar 应 DELETE /admin/library/instore/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await lib.deleteInstoreCigar(1)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/library/instore/1')
    })

    it('syncInstore 应 POST /admin/library/instore/sync', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await lib.syncInstore()
      expect(apiClient.post).toHaveBeenCalledWith('/admin/library/instore/sync')
    })
  })

  describe('Reference Cigars', () => {
    it('getReferenceCigars 应 GET /admin/library/reference', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await lib.getReferenceCigars({ page: 1 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/library/reference', { params: { page: 1 } })
    })

    it('createReferenceCigar 应 POST /admin/library/reference', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await lib.createReferenceCigar({ name: 'Ref' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/library/reference', { name: 'Ref' })
    })

    it('updateReferenceCigar 应 PUT /admin/library/reference/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await lib.updateReferenceCigar(2, { name: 'U' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/library/reference/2', { name: 'U' })
    })

    it('deleteReferenceCigar 应 DELETE /admin/library/reference/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await lib.deleteReferenceCigar(2)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/library/reference/2')
    })
  })

  describe('Flavor Tags', () => {
    it('getFlavorTags 应 GET /admin/library/tags', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await lib.getFlavorTags({ pageSize: 200 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/library/tags', { params: { pageSize: 200 } })
    })

    it('createFlavorTag 应 POST /admin/library/tags', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await lib.createFlavorTag({ name: '甜味' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/library/tags', { name: '甜味' })
    })

    it('updateFlavorTag 应 PUT /admin/library/tags/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await lib.updateFlavorTag(3, { name: 'U' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/library/tags/3', { name: 'U' })
    })

    it('deleteFlavorTag 应 DELETE /admin/library/tags/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await lib.deleteFlavorTag(3)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/library/tags/3')
    })
  })
})
