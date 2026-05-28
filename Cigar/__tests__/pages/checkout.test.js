/**
 * pages/checkout/checkout.test.js — 结账下单页面测试
 */
require('../setup')

const mockGetCart = jest.fn()
const mockGetMemberProfile = jest.fn()
const mockCreateOrder = jest.fn()
const mockPayOrder = jest.fn()
const mockSubmitReview = jest.fn()
const mockIsLoggedIn = jest.fn()
const mockPromptLogin = jest.fn()

jest.mock('../../utils/api', () => ({
  getCart: mockGetCart,
  getMemberProfile: mockGetMemberProfile,
  createOrder: mockCreateOrder,
  payOrder: mockPayOrder,
  submitReview: mockSubmitReview,
}))

jest.mock('../../utils/request', () => ({
  isLoggedIn: mockIsLoggedIn,
}))

const mockApp = { globalData: {}, promptLogin: mockPromptLogin }
global.getApp = () => mockApp

describe('pages/checkout/checkout', () => {
  let page

  beforeAll(() => {
    require('../../pages/checkout/checkout')
    page = global.Page.mock.calls.at(-1)[0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockIsLoggedIn.mockReturnValue(true)
    mockGetCart.mockResolvedValue({
      items: [
        { id: 1, productId: 10, name: '雪茄A', price: 200, qty: 2 },
        { id: 2, productId: 20, name: '雪茄B', price: 150, qty: 1 },
      ],
      total: 550,
    })
    mockGetMemberProfile.mockResolvedValue({
      userId: 1, nickname: 'VIP',
      balance: 1000, rechargeLevel: 3, consumptionLevel: 2,
      recharge: { level: 3 },
    })
    mockCreateOrder.mockResolvedValue({ orderId: 100, id: 100 })
    mockPayOrder.mockResolvedValue({ paid: true })
    mockSubmitReview.mockResolvedValue({})
    mockPromptLogin.mockResolvedValue(false)

    // Reset storage
    wx.removeStorageSync('checkout_idempotency_key')
  })

  describe('data 初始化', () => {
    it('初始支付方式为 balance', () => {
      expect(page.data.payMethod).toBe('balance')
      expect(page.data.paying).toBe(false)
      expect(page.data.showRateModal).toBe(false)
    })
  })

  describe('onLoad', () => {
    it('未登录时提示并返回', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      await page.onLoad()
      expect(mockPromptLogin).toHaveBeenCalledWith({ message: '结算前请先登录' })
    })

    it('已登录时加载购物车和会员信息', async () => {
      page.setData = jest.fn()
      await page.onLoad()

      expect(mockGetCart).toHaveBeenCalled()
      expect(mockGetMemberProfile).toHaveBeenCalled()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.any(Array),
          subtotal: 550,
          total: expect.any(Number),
          memberBalance: 1000,
        })
      )
    })

    it('购物车为空时提示并返回', async () => {
      mockGetCart.mockResolvedValue({ items: [], total: 0 })
      await page.onLoad()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('为空') })
      )
    })

    it('会员等级 >= 6 时计算折扣', async () => {
      mockGetMemberProfile.mockResolvedValue({
        userId: 1, nickname: 'VIP', balance: 1000, rechargeLevel: 6,
        recharge: { level: 6 },
      })
      page.setData = jest.fn()
      await page.onLoad()

      // subtotal = 550, discount = -55, total = 495
      const callArg = page.setData.mock.calls[0][0]
      expect(callArg.discount).toBeLessThan(0)
    })

    it('加载异常时提示', async () => {
      mockGetCart.mockRejectedValue(new Error('fail'))
      await page.onLoad()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('失败') })
      )
    })

    it('生成并存储幂等键', async () => {
      page.setData = jest.fn()
      await page.onLoad()
      expect(wx.getStorageSync('checkout_idempotency_key')).toBeTruthy()
    })
  })

  describe('selectPayMethod', () => {
    it('切换支付方式', () => {
      page.setData = jest.fn()
      page.selectPayMethod({ currentTarget: { dataset: { method: 'meituan' } } })
      expect(page.setData).toHaveBeenCalledWith({ payMethod: 'meituan' })
    })
  })

  describe('pay', () => {
    it('paying 状态时阻止重复支付', async () => {
      page.data.paying = true
      await page.pay()
      expect(mockCreateOrder).not.toHaveBeenCalled()
    })

    it('余额支付成功流程', async () => {
      page.data = {
        paying: false, payMethod: 'balance', total: 550, memberBalance: 1000,
        items: [{ productId: 10, price: 200, qty: 1 }],
      }
      page.setData = jest.fn()
      page._idempotencyKey = 'test-uuid'

      await page.pay()

      expect(mockCreateOrder).toHaveBeenCalledWith('test-uuid', expect.any(Array))
      expect(mockPayOrder).toHaveBeenCalledWith(100, 'balance')
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '支付成功', icon: 'success' })
      )
    })

    it('余额不足时提示去充值', async () => {
      page.data = {
        paying: false, payMethod: 'balance', total: 2000, memberBalance: 100,
        items: [{ productId: 10, price: 2000, qty: 1 }],
      }
      page.setData = jest.fn()

      // Mock showModal to capture confirm
      wx.showModal = jest.fn((opts) => {
        if (opts.success) opts.success({ confirm: true })
      })

      await page.pay()

      expect(mockCreateOrder).toHaveBeenCalled()
      expect(wx.showModal).toHaveBeenCalled()
      expect(wx.switchTab).toHaveBeenCalledWith({ url: '/pages/club/club' })
    })

    it('幂等命中(已支付)时直接成功', async () => {
      mockCreateOrder.mockResolvedValue({ orderId: 99, idempotent: true, status: 'paid' })
      page.data = { paying: false, payMethod: 'balance', total: 100, memberBalance: 500, items: [] }
      page.setData = jest.fn()
      page._idempotencyKey = 'idem-key'

      await page.pay()

      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '订单已支付' })
      )
    })

    it('订单创建失败(无orderId)时抛出', async () => {
      mockCreateOrder.mockResolvedValue({})
      page.data = { paying: false, payMethod: 'balance', total: 100, memberBalance: 500, items: [] }
      page.setData = jest.fn()
      page._idempotencyKey = 'bad-key'

      await page.pay()

      expect(page.setData).toHaveBeenCalledWith({ paying: false })
    })
  })

  describe('submitRate', () => {
    it('未打分时提示', async () => {
      page.data.rateScore = 0
      await page.submitRate()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('打分') })
      )
    })

    it('提交评价成功', async () => {
      page.data = { rateScore: 5, rateText: '很好', lastCigarId: 10, lastOrderId: 100 }
      page.setData = jest.fn()
      await page.submitRate()

      expect(mockSubmitReview).toHaveBeenCalledWith({
        cigarId: 10, orderId: 100, rating: 5, content: '很好',
      })
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('感谢') })
      )
    })

    it('敏感词错误提示', async () => {
      mockSubmitReview.mockRejectedValue(new Error('包含敏感词'))
      page.data = { rateScore: 4, rateText: '', lastCigarId: 10, lastOrderId: null }
      await page.submitRate()

      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('敏感词') })
      )
    })
  })

  describe('onRateScoreChange', () => {
    it('更新评分', () => {
      page.setData = jest.fn()
      page.onRateScoreChange({ detail: { value: 4 } })
      expect(page.setData).toHaveBeenCalledWith({ rateScore: 4 })
    })
  })
})
