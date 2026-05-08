import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'

const mockStore = {
  user: { name: 'Admin', role: 'admin' },
  logout: vi.fn(),
  pendingOrders: 3,
  setSiderCollapsed: vi.fn(),
}
vi.mock('../../store/useStore', () => ({
  default: () => mockStore,
}))

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.user = { name: 'Admin', role: 'admin' }
    mockStore.pendingOrders = 3
  })

  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AdminLayout />
      </MemoryRouter>
    )
  }

  it('应渲染侧边栏Logo', async () => {
    renderLayout()
    await waitFor(() => {
      expect(screen.getByText('GOAT CIGAR CLUB')).toBeTruthy()
      expect(screen.getByText('管理后台')).toBeTruthy()
    })
  })

  it('应显示用户名称', async () => {
    renderLayout()
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeTruthy()
    })
  })

  it('无用户时显示默认头像文字', async () => {
    mockStore.user = null
    renderLayout()
    await waitFor(() => {
      expect(screen.getByText('A')).toBeTruthy()
    })
  })

  it('应渲染菜单项', async () => {
    renderLayout()
    await waitFor(() => {
      expect(screen.getByText('数据概览')).toBeTruthy()
      expect(screen.getByText('订单管理')).toBeTruthy()
    })
  })

  it('应正常渲染不崩溃', () => {
    const { container } = renderLayout()
    expect(container).toBeTruthy()
  })
})
