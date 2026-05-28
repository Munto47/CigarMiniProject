/**
 * pages/club/club.test.js — 会员俱乐部页面测试
 */
require('../setup')

const mockGetMemberProfile = jest.fn()
const mockGetRechargeTiers = jest.fn()
const mockGetStoreInfo = jest.fn()
const mockRecharge = jest.fn()
const mockIsLoggedIn = jest.fn()
const mockClearTokens = jest.fn()
const mockPromptLogin = jest.fn()

jest.mock('../../utils/api', () => ({
  getMemberProfile: mockGetMemberProfile,
  getRechargeTiers: mockGetRechargeTiers,
  getStoreInfo: mockGetStoreInfo,
  recharge: mockRecharge,
}))

jest.mock('../../utils/request', () => ({
  isLoggedIn: mockIsLoggedIn,
  clearTokens: mockClearTokens,
}))

const mockAutoLogin = jest.fn(() => Promise.resolve())
const mockApp = {
  globalData: { selectedTab: -1 },
  _autoLogin: mockAutoLogin,
  promptLogin: mockPromptLogin,
}
global.getApp = () => mockApp

const mockTabBar = { setData: jest.fn() }

describe('pages/club/club', () => {
  let page

  beforeAll(() => {
    require('../../pages/club/club')
    page = global.Page.mock.calls.at(-1)[0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockIsLoggedIn.mockReturnValue(true)
    mockPromptLogin.mockResolvedValue(true)
    mockGetMemberProfile.mockResolvedValue({
      name: 'VIP用户',
      balance: 5000,
      discount: '无折扣',
      avatarUrl: '/avatar.jpg',
      recharge: { level: 3, levelName: 'V3', points: 2500, nextLevel: 4, remain: 500, progress: 83 },
      consume: { level: 2, levelName: 'V2', points: 1500, nextLevel: 3, remain: 1500, progress: 50 },
      rechargeLevel: 3,
      consumptionLevel: 2,
    })
    mockGetStoreInfo.mockResolvedValue({
      phone: '13800138000',
      address: '上海市XX路',
      businessHours: '10:00-22:00',
      storeName: 'GOAT CIGAR CLUB',
    })
    mockGetRechargeTiers.mockResolvedValue([
      { id: 1, amountCents: '10000', bonusCents: '1000' },
      { id: 2, amountCents: '20000', bonusCents: '3000' },
    ])
  })

  describe('data 初始化', () => {
    it('初始会员名称为默认值', () => {
      expect(page.data.member.name).toBe('雪茄绅士')
      expect(page.data.member.balance).toBe(0)
      expect(page.data.showLoginTip).toBe(false)
    })

    it('gridItems 有 6 项', () => {
      expect(page.data.gridItems).toHaveLength(6)
    })
  })

  describe('_loadData', () => {
    it('未登录时显示登录提示', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.setData = jest.fn()
      await page._loadData()
      expect(page.setData).toHaveBeenCalledWith({ showLoginTip: true })
    })

    it('登录后加载会员资料和店铺信息', async () => {
      page.setData = jest.fn()
      await page._loadData()

      expect(mockGetMemberProfile).toHaveBeenCalled()
      expect(mockGetStoreInfo).toHaveBeenCalled()
      // setData 分 3 次调用: showLoginTip, member, storeInfo
      expect(page.setData).toHaveBeenCalledWith({ showLoginTip: false })
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ member: expect.any(Object) })
      )
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ storeInfo: expect.any(Object) })
      )
    })

    it('getMemberProfile 返回 null 不影响 storeInfo', async () => {
      mockGetMemberProfile.mockResolvedValue(null)
      page.setData = jest.fn()
      await page._loadData()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ storeInfo: expect.any(Object) })
      )
    })

    it('storeInfo 失败不影响 profile 加载', async () => {
      mockGetStoreInfo.mockRejectedValue(new Error('fail'))
      page.setData = jest.fn()
      await page._loadData()
      expect(page.setData).toHaveBeenCalled()
    })
  })

  describe('topup', () => {
    it('未登录时拉起登录提示', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      await page.topup()
      expect(mockPromptLogin).toHaveBeenCalledWith({ message: '充值前请先登录' })
    })

    it('成功加载充值档位并拉起选择', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      await page.topup()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ showTopupModal: true, selectedTierIndex: 0 })
      )
    })

    it('无充值档位时提示', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      mockGetRechargeTiers.mockResolvedValue([])
      await page.topup()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('加载') })
      )
    })

    it('获取档位异常时提示', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      mockGetRechargeTiers.mockRejectedValue(new Error('fail'))
      await page.topup()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('不可用') })
      )
    })
  })

  describe('onGridTap', () => {
    it('orders 未登录时拉起登录提示', () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.onGridTap({ currentTarget: { dataset: { index: 0 } } })
      expect(mockPromptLogin).toHaveBeenCalledWith({ message: '查看订单前请先登录' })
    })

    it('orders 已登录时跳转', () => {
      mockIsLoggedIn.mockReturnValue(true)
      page.onGridTap({ currentTarget: { dataset: { index: 0 } } })
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/orders/index' })
    })

    it('contact 有信息时弹窗', () => {
      page.data.storeInfo = { phone: '13800138000', address: 'XX' }
      page.onGridTap({ currentTarget: { dataset: { index: 5 } } })
      expect(wx.showModal).toHaveBeenCalled()
    })

    it('contact 无信息时提示', () => {
      page.data.storeInfo = null
      page.onGridTap({ currentTarget: { dataset: { index: 5 } } })
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('客服') })
      )
    })

    it('未实现功能提示即将上线', () => {
      page.onGridTap({ currentTarget: { dataset: { index: 1 } } })
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('即将上线') })
      )
    })
  })

  describe('_showContact', () => {
    it('有 storeInfo.phone 时弹窗拨打', () => {
      page.data.storeInfo = { phone: '138', address: '地址', storeName: 'GOAT' }
      // Mock showModal to trigger confirm
      wx.showModal = jest.fn((opts) => opts.success && opts.success({ confirm: true }))
      page._showContact()
      expect(wx.showModal).toHaveBeenCalled()
      expect(wx.makePhoneCall).toHaveBeenCalledWith({ phoneNumber: '138' })
    })

    it('无 storeInfo.phone 时不弹窗', () => {
      page.data.storeInfo = { address: '地址' }
      page._showContact()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('客服') })
      )
    })
  })

  describe('viewDetail', () => {
    it('未登录时拉起登录提示', () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.viewDetail()
      expect(mockPromptLogin).toHaveBeenCalledWith({ message: '查看余额流水前请先登录' })
    })

    it('已登录时跳转交易记录', () => {
      mockIsLoggedIn.mockReturnValue(true)
      page.viewDetail()
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/member-transactions/index' })
    })
  })

  describe('doLogin', () => {
    it('登录后刷新数据', async () => {
      mockPromptLogin.mockImplementation(({ onSuccess }) => {
        if (typeof onSuccess === 'function') onSuccess()
        return Promise.resolve(true)
      })
      const spy = jest.spyOn(page, '_loadData').mockImplementation(() => {})
      await page.doLogin()
      expect(mockPromptLogin).toHaveBeenCalledWith({
        message: '登录后可查看会员权益与余额',
        onSuccess: expect.any(Function),
      })
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
