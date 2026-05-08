import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import * as productsApi from '../../api/products'

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('products API', () => {
  describe('Cigars', () => {
    it('getCigars 应 GET /admin/products/cigars 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await productsApi.getCigars({ page: 1, keyword: 'test' })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/products/cigars', { params: { page: 1, keyword: 'test' } })
    })

    it('getCigar 应 GET /admin/products/cigars/:id', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await productsApi.getCigar(42)
      expect(apiClient.get).toHaveBeenCalledWith('/admin/products/cigars/42')
    })

    it('createCigar 应 POST /admin/products/cigars', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await productsApi.createCigar({ name: 'Test' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/products/cigars', { name: 'Test' })
    })

    it('updateCigar 应 PUT /admin/products/cigars/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await productsApi.updateCigar(1, { name: 'Updated' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/products/cigars/1', { name: 'Updated' })
    })

    it('deleteCigar 应 DELETE /admin/products/cigars/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await productsApi.deleteCigar(1)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/products/cigars/1')
    })
  })

  describe('Drinks', () => {
    it('getDrinks 应 GET /admin/products/drinks 带 params', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: [] } })
      await productsApi.getDrinks({ page: 1 })
      expect(apiClient.get).toHaveBeenCalledWith('/admin/products/drinks', { params: { page: 1 } })
    })

    it('getDrink 应 GET /admin/products/drinks/:id', async () => {
      apiClient.get.mockResolvedValue({ data: { code: 0, data: {} } })
      await productsApi.getDrink(7)
      expect(apiClient.get).toHaveBeenCalledWith('/admin/products/drinks/7')
    })

    it('createDrink 应 POST /admin/products/drinks', async () => {
      apiClient.post.mockResolvedValue({ data: { code: 0 } })
      await productsApi.createDrink({ name: 'Drink' })
      expect(apiClient.post).toHaveBeenCalledWith('/admin/products/drinks', { name: 'Drink' })
    })

    it('updateDrink 应 PUT /admin/products/drinks/:id', async () => {
      apiClient.put.mockResolvedValue({ data: { code: 0 } })
      await productsApi.updateDrink(1, { name: 'U' })
      expect(apiClient.put).toHaveBeenCalledWith('/admin/products/drinks/1', { name: 'U' })
    })

    it('deleteDrink 应 DELETE /admin/products/drinks/:id', async () => {
      apiClient.delete.mockResolvedValue({ data: { code: 0 } })
      await productsApi.deleteDrink(1)
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/products/drinks/1')
    })
  })
})
