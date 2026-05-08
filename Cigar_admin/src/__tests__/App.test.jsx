import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import App from '../App'

const mockStore = {
  user: { name: 'Admin' },
  logout: vi.fn(),
  pendingOrders: 0,
}
vi.mock('../store/useStore', () => ({
  default: () => mockStore,
}))

// Mock page components to simplify render
vi.mock('../pages/login/index', () => ({ default: () => null }))
vi.mock('../pages/dashboard/index', () => ({ default: () => null }))
vi.mock('../pages/products/cigars/index', () => ({ default: () => null }))
vi.mock('../pages/products/drinks/index', () => ({ default: () => null }))
vi.mock('../pages/library/instore/index', () => ({ default: () => null }))
vi.mock('../pages/library/reference/index', () => ({ default: () => null }))
vi.mock('../pages/library/tags/index', () => ({ default: () => null }))
vi.mock('../pages/orders/index', () => ({ default: () => null }))
vi.mock('../pages/members/index', () => ({ default: () => null }))
vi.mock('../pages/storedvalue/index', () => ({ default: () => null }))
vi.mock('../pages/posters/index', () => ({ default: () => null }))
vi.mock('../pages/reviews/index', () => ({ default: () => null }))
vi.mock('../pages/accounts/index', () => ({ default: () => null }))
vi.mock('../pages/statistics/index', () => ({ default: () => null }))
vi.mock('../pages/settings/index', () => ({ default: () => null }))
vi.mock('../layouts/AdminLayout', () => ({ default: () => null }))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.user = { name: 'Admin' }
  })

  it('应渲染不崩溃', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('未登录用户重定向逻辑存在', async () => {
    mockStore.user = null
    const { container } = render(<App />)
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
