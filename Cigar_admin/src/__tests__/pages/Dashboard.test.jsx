import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../../pages/dashboard'

vi.mock('../../api/dashboard', () => ({
  getOverview: vi.fn(),
  getSalesTrend: vi.fn(),
  getRecentOrders: vi.fn(),
  getTopProducts: vi.fn(),
}))

import { getOverview, getSalesTrend, getRecentOrders, getTopProducts } from '../../api/dashboard'

const mockOverview = {
  orders: { today: 12 },
  revenue: { todayYuan: '3580.00' },
  users: { total: 256 },
  balance: { totalYuan: '125000.00' },
}

const mockSalesTrend = [
  { date: '2026-05-01', orders: 8, revenueYuan: '1200.00' },
  { date: '2026-05-02', orders: 15, revenueYuan: '2400.00' },
]

const mockRecentOrders = [
  { orderId: 1, orderNo: 'GC20260501001', userName: '张三', actualPayYuan: '358.00', payMethod: 'balance', status: 'paid', createdAt: '2026-05-01 12:00' },
]

const mockTopProducts = [
  { name: '高希霸罗布图', soldQty: 25 },
]

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderDashboard() {
    return render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
  }

  it('应渲染页面标题', async () => {
    getOverview.mockResolvedValue({ data: { code: 0, data: mockOverview } })
    getSalesTrend.mockResolvedValue({ data: { code: 0, data: mockSalesTrend } })
    getRecentOrders.mockResolvedValue({ data: { code: 0, data: mockRecentOrders } })
    getTopProducts.mockResolvedValue({ data: { code: 0, data: mockTopProducts } })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('数据概览')).toBeInTheDocument()
      expect(screen.getByText('今日运营数据实时展示')).toBeInTheDocument()
    })
  })

  it('应渲染 4 个统计卡片', async () => {
    getOverview.mockResolvedValue({ data: { code: 0, data: mockOverview } })
    getSalesTrend.mockResolvedValue({ data: { code: 0, data: mockSalesTrend } })
    getRecentOrders.mockResolvedValue({ data: { code: 0, data: mockRecentOrders } })
    getTopProducts.mockResolvedValue({ data: { code: 0, data: mockTopProducts } })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('今日订单')).toBeInTheDocument()
      expect(screen.getByText('今日销售额')).toBeInTheDocument()
      expect(screen.getByText('注册用户')).toBeInTheDocument()
      expect(screen.getByText('储值总额')).toBeInTheDocument()
    })
  })

  it('应显示订单数据', async () => {
    getOverview.mockResolvedValue({ data: { code: 0, data: mockOverview } })
    getSalesTrend.mockResolvedValue({ data: { code: 0, data: mockSalesTrend } })
    getRecentOrders.mockResolvedValue({ data: { code: 0, data: mockRecentOrders } })
    getTopProducts.mockResolvedValue({ data: { code: 0, data: mockTopProducts } })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('256')).toBeInTheDocument()
    })
  })

  it('应渲染最新订单表格', async () => {
    getOverview.mockResolvedValue({ data: { code: 0, data: mockOverview } })
    getSalesTrend.mockResolvedValue({ data: { code: 0, data: mockSalesTrend } })
    getRecentOrders.mockResolvedValue({ data: { code: 0, data: mockRecentOrders } })
    getTopProducts.mockResolvedValue({ data: { code: 0, data: mockTopProducts } })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('最新订单')).toBeInTheDocument()
    })
  })

  it('API 失败时应静默处理(不崩溃)', async () => {
    getOverview.mockRejectedValue(new Error('网络错误'))
    getSalesTrend.mockRejectedValue(new Error('网络错误'))
    getRecentOrders.mockRejectedValue(new Error('网络错误'))
    getTopProducts.mockRejectedValue(new Error('网络错误'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('数据概览')).toBeInTheDocument()
    })
  })
})
