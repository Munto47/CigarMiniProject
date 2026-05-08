/**
 * pages/cart/cart.test.js — 购物车页面测试
 */
require('../setup')

const mockGetCart = jest.fn()
const mockUpdateCartQty = jest.fn()
const mockRemoveCartItem = jest.fn()
const mockGetCartCount = jest.fn()
const mockIsLoggedIn = jest.fn()

jest.mock('../../utils/api', () => ({
  getCart: mockGetCart,
  updateCartQty: mockUpdateCartQty,
  removeCartItem: mockRemoveCartItem,
  getCartCount: mockGetCartCount,
}))

jest.mock('../../utils/request', () => ({
  isLoggedIn: mockIsLoggedIn,
}))

const mockUpdateCartBadge = jest.fn()
const mockAutoLogin = jest.fn(() => Promise.resolve())
const mockApp = {
  globalData: { selectedTab: -1, cartCount: 0 },
  updateCartBadge: mockUpdateCartBadge,
  _autoLogin: mockAutoLogin,
}
global.getApp = () => mockApp

const mockTabBar = { setData: jest.fn() }

describe('pages/cart/cart', () => {
  let page

  beforeAll(() => {
    require('../../pages/cart/cart')
    page = global.Page.mock.calls.at(-1)[0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockGetCart.mockResolvedValue({
      items: [
        { id: 1, name: '雪茄A', price: 200, qty: 2, thumbUrl: '/a.jpg', available: true },
        { id: 2, name: '雪茄B', price: 150, qty: 1, thumbUrl: '/b.jpg', available: true },
      ],
      total: 550,
    })
    mockGetCartCount.mockResolvedValue(3)
    mockIsLoggedIn.mockReturnValue(true)
    mockApp.globalData.cartCount = 0
    page.data = {
      items: [],
      isEmpty: true,
      isLoggedIn: false,
      total: 0,
      loading: true,
    }
  })

  describe('data 初始化', () => {
    it('初始为空购物车', () => {
      expect(page.data.items).toEqual([])
      expect(page.data.isEmpty).toBe(true)
      expect(page.data.total).toBe(0)
      expect(page.data.loading).toBe(true)
    })
  })

  describe('_loadCart', () => {
    it('未登录时显示空购物车', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.setData = jest.fn()
      await page._loadCart()
      // _loadCart 调用 2 次 setData: 先标记未登录，再清空
      expect(page.setData).toHaveBeenCalledWith({ isLoggedIn: false })
      expect(page.setData).toHaveBeenCalledWith({ loading: false, isEmpty: true, items: [], total: 0 })
    })

    it('已登录时加载购物车数据', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      page.setData = jest.fn()
      await page._loadCart()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmpty: false, total: 550, loading: false,
        })
      )
      expect(mockGetCart).toHaveBeenCalled()
    })

    it('网络失败时 loading 结束', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      mockGetCart.mockRejectedValue(new Error('fail'))
      page.setData = jest.fn()
      await page._loadCart()
      expect(page.setData).toHaveBeenCalledWith({ loading: false })
    })
  })

  describe('changeQty', () => {
    it('增加数量后更新 UI 和同步后端', async () => {
      page.data.items = [
        { id: 1, name: '雪茄A', price: 200, qty: 2 },
        { id: 2, name: '雪茄B', price: 150, qty: 1 },
      ]
      page.setData = jest.fn()
      mockUpdateCartQty.mockResolvedValue({})
      await page.changeQty({ currentTarget: { dataset: { id: 1, delta: 1 } } })

      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ id: 1, qty: 3 }),
          ]),
        })
      )
      expect(mockUpdateCartQty).toHaveBeenCalledWith(1, 3)
    })

    it('减少至 0 时移除该商品', async () => {
      page.data.items = [{ id: 1, name: '雪茄A', price: 200, qty: 1 }]
      page.setData = jest.fn()
      mockUpdateCartQty.mockResolvedValue({})
      await page.changeQty({ currentTarget: { dataset: { id: 1, delta: -1 } } })

      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ items: [], isEmpty: true })
      )
    })

    it('同步失败时重新加载', async () => {
      page.data.items = [{ id: 1, name: 'A', price: 200, qty: 1 }]
      page.setData = jest.fn()
      mockUpdateCartQty.mockRejectedValue(new Error('fail'))
      // _loadCart will be called on failure
      const spy = jest.spyOn(page, '_loadCart').mockImplementation(() => {})
      await page.changeQty({ currentTarget: { dataset: { id: 1, delta: 1 } } })
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('removeItem', () => {
    it('删除指定商品', async () => {
      page.data.items = [
        { id: 1, name: 'A', price: 200, qty: 1 },
        { id: 2, name: 'B', price: 150, qty: 2 },
      ]
      page.setData = jest.fn()
      mockRemoveCartItem.mockResolvedValue({})
      await page.removeItem({ currentTarget: { dataset: { id: 1 } } })

      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ isEmpty: false })
      )
      expect(mockRemoveCartItem).toHaveBeenCalledWith(1)
    })

    it('删除失败时重新加载', async () => {
      page.data.items = [{ id: 1, name: 'A', price: 200, qty: 1 }]
      page.setData = jest.fn()
      mockRemoveCartItem.mockRejectedValue(new Error('fail'))
      const spy = jest.spyOn(page, '_loadCart').mockImplementation(() => {})
      await page.removeItem({ currentTarget: { dataset: { id: 1 } } })
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('checkout', () => {
    it('空购物车时不跳转', () => {
      page.data.isEmpty = true
      page.checkout()
      expect(wx.navigateTo).not.toHaveBeenCalled()
    })

    it('未登录时提示', () => {
      page.data.isEmpty = false
      mockIsLoggedIn.mockReturnValue(false)
      page.checkout()
      expect(wx.showToast).toHaveBeenCalled()
    })

    it('有商品且已登录时跳转结账页', () => {
      page.data.isEmpty = false
      mockIsLoggedIn.mockReturnValue(true)
      page.checkout()
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/checkout/checkout' })
    })
  })

  describe('doLogin', () => {
    it('登录成功后重新加载购物车', async () => {
      mockAutoLogin.mockResolvedValue(undefined)
      const spy = jest.spyOn(page, '_loadCart').mockImplementation(() => {})
      await page.doLogin()
      expect(mockAutoLogin).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
