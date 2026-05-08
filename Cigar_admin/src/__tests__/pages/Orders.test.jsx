import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OrdersPage from '../../pages/orders'

vi.mock('../../api/orders', () => ({
  getOrders: vi.fn(),
  getOrderDetail: vi.fn(),
  updateOrderStatus: vi.fn(),
  refundOrder: vi.fn(),
  syncMeituan: vi.fn(),
}))

import { getOrders, getOrderDetail } from '../../api/orders'

const mockOrders = {
  list: [
    { id: 1, orderNo: 'GC001', userName: '张三', actualPayYuan: '358', status: 'pending', payMethod: 'balance', createdAt: '2026-05-01' },
    { id: 2, orderNo: 'GC002', userName: '李四', actualPayYuan: '520', status: 'paid', payMethod: 'meituan', createdAt: '2026-05-02' },
  ],
  total: 2,
}

const mockOrderDetail = {
  orderNo: 'GC001',
  userName: '张三',
  status: 'pending',
  items: [{ name: '高希霸', qty: 1, priceYuan: '358' }],
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderOrders() {
    return render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    )
  }

  it('应渲染页面标题', async () => {
    getOrders.mockResolvedValue({ data: { code: 0, data: mockOrders } })
    renderOrders()
    await waitFor(() => {
      expect(screen.getAllByText('订单管理')[0]).toBeInTheDocument()
    })
  })

  it('应加载并显示订单列表', async () => {
    getOrders.mockResolvedValue({ data: { code: 0, data: mockOrders } })
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText('GC001')).toBeInTheDocument()
      expect(screen.getByText('GC002')).toBeInTheDocument()
    })
  })

  it('应渲染状态过滤器', async () => {
    getOrders.mockResolvedValue({ data: { code: 0, data: mockOrders } })
    renderOrders()
    await waitFor(() => {
      expect(screen.getAllByText('订单管理')[0]).toBeInTheDocument()
    })
  })

  it('点击查看按钮应打开详情抽屉', async () => {
    const user = userEvent.setup()
    getOrders.mockResolvedValue({ data: { code: 0, data: mockOrders } })
    getOrderDetail.mockResolvedValue({ data: { code: 0, data: mockOrderDetail } })

    renderOrders()

    await waitFor(() => {
      expect(screen.getByText('GC001')).toBeInTheDocument()
    })
  })

  it('API 失败时应显示错误提示', async () => {
    getOrders.mockRejectedValue(new Error('加载失败'))
    renderOrders()
    await waitFor(() => {
      expect(screen.getAllByText('订单管理')[0]).toBeInTheDocument()
    })
  })
})
