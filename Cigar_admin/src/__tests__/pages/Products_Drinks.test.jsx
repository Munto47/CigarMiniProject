import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DrinksPage from '../../pages/products/drinks'

vi.mock('../../api/products', () => ({
  getDrinks: vi.fn(),
  createDrink: vi.fn(),
  updateDrink: vi.fn(),
  deleteDrink: vi.fn(),
}))

import { getDrinks } from '../../api/products'

const mockDrinks = { list: [{ id: 1, name: '麦卡伦', categoryName: '威士忌' }], total: 1 }

describe('DrinksPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><DrinksPage /></MemoryRouter>)
  }

  it('应调用 getDrinks API', async () => {
    getDrinks.mockResolvedValue({ data: { code: 0, data: mockDrinks } })
    renderPage()
    await waitFor(() => {
      expect(getDrinks).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getDrinks.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
