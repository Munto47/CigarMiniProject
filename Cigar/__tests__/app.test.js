/**
 * app.js 测试 —— 小程序入口逻辑
 * 覆盖：自动登录、购物车角标更新
 */
require('./setup')

// Mock api.wechatLogin
const mockWechatLogin = jest.fn()
jest.mock('../utils/api', () => ({
  wechatLogin: mockWechatLogin,
}))

// Mock request 模块
const mockGetAccessToken = jest.fn()
const mockSaveTokens = jest.fn()
const mockSaveUserInfo = jest.fn()

jest.mock('../utils/request', () => ({
  getAccessToken: mockGetAccessToken,
  saveTokens: mockSaveTokens,
  saveUserInfo: mockSaveUserInfo,
}))

// 模拟 getCurrentPages
const mockTabBar = { setData: jest.fn() }
const mockPages = []
global.getCurrentPages = () => mockPages

describe('app.js', () => {
  let appOptions

  beforeAll(() => {
    // App 已在 setup 中定义为 jest.fn()
    // require app.js 触发 App(config)
    require('../app')
    appOptions = global.App.mock.calls[0][0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPages.length = 0
  })

  it('应定义 globalData', () => {
    expect(appOptions.globalData).toBeDefined()
    expect(appOptions.globalData.selectedTab).toBe(0)
    expect(appOptions.globalData.cartCount).toBe(0)
  })

  describe('_autoLogin — 自动登录', () => {
    it('已有 accessToken 时不触发微信登录', async () => {
      mockGetAccessToken.mockReturnValue('existing-token')
      await appOptions._autoLogin()
      // wx.login 不应被调用
      expect(wx.login).not.toHaveBeenCalled()
    })

    it('无 accessToken 时调用 wx.login', () => {
      mockGetAccessToken.mockReturnValue('')
      appOptions._autoLogin()
      expect(wx.login).toHaveBeenCalled()
    })

    it('wx.login 成功后保存 token 和用户信息', async () => {
      mockGetAccessToken.mockReturnValue('')
      mockWechatLogin.mockResolvedValue({
        accessToken: 'login-at',
        refreshToken: 'login-rt',
        user: { nickName: 'TestUser' },
      })

      // 重写 wx.login 以触发 success
      wx.login = jest.fn((options) => {
        options.success({ code: 'wx-code-123' })
      })

      await appOptions._autoLogin()

      expect(mockWechatLogin).toHaveBeenCalledWith('wx-code-123')
      expect(mockSaveTokens).toHaveBeenCalledWith('login-at', 'login-rt')
      expect(mockSaveUserInfo).toHaveBeenCalledWith({ nickName: 'TestUser' })
    })

    it('wechatLogin 失败时静默处理', async () => {
      mockGetAccessToken.mockReturnValue('')
      mockWechatLogin.mockRejectedValue(new Error('登录失败'))

      wx.login = jest.fn((options) => {
        options.success({ code: 'bad-code' })
      })

      // 不应抛出异常
      await expect(appOptions._autoLogin()).resolves.toBeUndefined()
    })

    it('wx.login 微信层面失败时静默处理', async () => {
      mockGetAccessToken.mockReturnValue('')

      wx.login = jest.fn((options) => {
        if (options.fail) options.fail({ errMsg: 'login:fail' })
      })

      // 不应抛出异常
      await expect(appOptions._autoLogin()).resolves.toBeUndefined()
    })

    it('login 返回无 userInfo 时只保存 token', async () => {
      mockGetAccessToken.mockReturnValue('')
      mockWechatLogin.mockResolvedValue({
        accessToken: 'at-only',
        refreshToken: 'rt-only',
      })

      wx.login = jest.fn((options) => {
        options.success({ code: 'code-ok' })
      })

      await appOptions._autoLogin()

      expect(mockSaveTokens).toHaveBeenCalledWith('at-only', 'rt-only')
      expect(mockSaveUserInfo).not.toHaveBeenCalled()
    })
  })

  describe('updateCartBadge — 购物车角标', () => {
    it('应更新 globalData.cartCount', () => {
      appOptions.updateCartBadge(5)
      expect(appOptions.globalData.cartCount).toBe(5)
    })

    it('无页面时不崩溃', () => {
      mockPages.length = 0
      expect(() => appOptions.updateCartBadge(3)).not.toThrow()
    })

    it('当前页无 getTabBar 时不崩溃', () => {
      mockPages.length = 1
      mockPages[0] = {}
      expect(() => appOptions.updateCartBadge(2)).not.toThrow()
    })

    it('当前页有 tabBar 时调用 setData', () => {
      mockPages.length = 1
      mockPages[0] = { getTabBar: () => mockTabBar }

      appOptions.updateCartBadge(3)
      expect(mockTabBar.setData).toHaveBeenCalledWith({ cartCount: 3 })
    })
  })
})
