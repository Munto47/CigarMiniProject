require('../setup')

const mockGetOrderList = jest.fn()
const mockCancelOrder = jest.fn()
const mockIsLoggedIn = jest.fn()

jest.mock('../../utils/api', () => ({
  getOrderList: mockGetOrderList,
  cancelOrder: mockCancelOrder,
}))
jest.mock('../../utils/request', () => ({ isLoggedIn: mockIsLoggedIn }))

global.getApp = () => ({ globalData: {} })

describe('pages/orders/index', () => {
  let page
  beforeAll(() => {
    require('../../pages/orders/index')
    page = global.Page.mock.calls.at(-1)[0]
  })
  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockIsLoggedIn.mockReturnValue(true)
    mockGetOrderList.mockResolvedValue({
      list: [
        { id: '1', orderNo: 'GC001', status: 'pending', totalYuan: '358.00',
          items: [{ name: '雪茄A' }], createdAt: '2026-05-03 12:00' },
        { id: '2', orderNo: 'GC002', status: 'completed', totalYuan: '200.00',
          items: [], createdAt: '2026-05-01 10:00' },
      ],
      total: 2,
    })
    page.data = {
      orders: [], activeTab: 0, page: 1, pageSize: 20,
      total: 0, hasMore: true, loading: false,
    }
  })

  it('data 初始状态', () => {
    expect(page.data.activeTab).toBe(0)
    expect(page.data.orders).toEqual([])
  })

  describe('onLoad', () => {
    it('未登录时提示并返回', () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.onLoad()
      expect(wx.showToast).toHaveBeenCalled()
    })

    it('已登录时拉取订单', () => {
      page.onLoad()
      expect(mockGetOrderList).toHaveBeenCalled()
    })
  })

  describe('_fetchOrders', () => {
    it('加载中时不重复请求', async () => {
      page.data.loading = true
      await page._fetchOrders()
      expect(mockGetOrderList).not.toHaveBeenCalled()
    })

    it('成功加载订单并转换格式', async () => {
      await page._fetchOrders(true)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({ orderNo: 'GC001', statusLabel: '待支付' }),
          ]),
        })
      )
    })

    it('加载失败时结束loading', async () => {
      mockGetOrderList.mockRejectedValue(new Error('fail'))
      await page._fetchOrders()
      expect(page.setData).toHaveBeenCalledWith({ loading: false })
    })
  })

  describe('switchTab', () => {
    it('切换状态标签并重置', () => {
      page._fetchOrders = jest.fn()
      page.switchTab({ currentTarget: { dataset: { index: 1 } } })
      expect(page.setData).toHaveBeenCalledWith({ activeTab: 1, orders: [], page: 1 })
    })
  })

  it('viewDetail 跳转详情', () => {
    page.viewDetail({ currentTarget: { dataset: { id: 1 } } })
    expect(wx.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('orderId=1') })
    )
  })

  describe('cancelOrder', () => {
    it('确认取消订单', async () => {
      wx.showModal = jest.fn((opts) => opts.success({ confirm: true }))
      mockCancelOrder.mockResolvedValue({})
      page._fetchOrders = jest.fn()
      page.cancelOrder({ currentTarget: { dataset: { id: 5 } } })
      // Wait for async
      await new Promise(r => setTimeout(r, 10))
      expect(mockCancelOrder).toHaveBeenCalledWith(5)
    })

    it('取消确认时不操作', () => {
      wx.showModal = jest.fn((opts) => opts.success({ confirm: false }))
      page.cancelOrder({ currentTarget: { dataset: { id: 5 } } })
      expect(mockCancelOrder).not.toHaveBeenCalled()
    })
  })
})
