const { getCart, updateCartQty, removeCartItem, getCartCount, addToCart, getDrinkDetail } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

Page({
  data: {
    items: [],
    isEmpty: true,
    isLoggedIn: false,
    total: 0,
    loading: true,

    showDrinkModal: false,
    activeDrink: null,
  },

  onShow() {
    getApp().globalData.selectedTab = 2
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this._loadCart()
  },

  async _loadCart() {
    const loggedIn = isLoggedIn()
    this.setData({ isLoggedIn: loggedIn })
    if (!loggedIn) {
      this.setData({ loading: false, isEmpty: true, items: [], total: 0 })
      return
    }

    try {
      const cart = await getCart()
      const items = cart.items || []
      this.setData({
        items,
        isEmpty: items.length === 0,
        total: cart.total || 0,
        loading: false,
      })
      this._syncBadge(items.reduce((s, i) => s + i.qty, 0))
    } catch {
      this.setData({ loading: false })
    }
  },

  async changeQty(e) {
    const { id, delta } = e.currentTarget.dataset

    // 乐观更新
    const items = this.data.items.map(item => {
      if (item.id !== id) return item
      const newQty = item.qty + delta
      return newQty < 1 ? null : { ...item, qty: newQty }
    }).filter(Boolean)

    this.setData({ items, isEmpty: items.length === 0, total: this._calcTotal(items) })
    this._syncBadge(items.reduce((s, i) => s + i.qty, 0))

    // 同步到后端
    try {
      const targetItem = items.find(i => i.id === id)
      if (targetItem) {
        await updateCartQty(id, targetItem.qty)
      }
    } catch {
      // 失败时重新加载
      this._loadCart()
    }
  },

  async removeItem(e) {
    const { id } = e.currentTarget.dataset

    // 乐观删除
    const items = this.data.items.filter(i => i.id !== id)
    this.setData({ items, isEmpty: items.length === 0, total: this._calcTotal(items) })
    this._syncBadge(items.reduce((s, i) => s + i.qty, 0))

    // 同步到后端
    try {
      await removeCartItem(id)
    } catch {
      this._loadCart()
    }
  },

  _calcTotal(items) {
    return items.reduce((s, i) => s + i.price * i.qty, 0)
  },

  async _syncBadge(count) {
    getApp().updateCartBadge(count)
    // 后台用服务端数量校准
    try {
      if (isLoggedIn()) {
        const serverCount = await getCartCount()
        getApp().updateCartBadge(serverCount)
      }
    } catch { /* ignore */ }
  },

  checkout() {
    if (this.data.isEmpty) return
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/checkout/checkout' })
  },

  doLogin() {
    getApp()._autoLogin().then(() => this._loadCart()).catch(() => {})
  },

  goExplore() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goToDetail(e) {
    const { productId, productType } = e.currentTarget.dataset
    if (productType === 'cigar') {
      wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${productId}` })
    }
    // 饮品点信息区域不做导航，由图片区域的弹窗处理
  },

  /* ════════ 饮品详情 ════════ */

  async onItemImgTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return
    if (item.productType === 'cigar') {
      wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${item.productId}` })
      return
    }
    // 饮品：先用购物车已有信息快速展示弹窗，再拉完整详情
    this.setData({
      showDrinkModal: true,
      activeDrink: {
        id: item.productId,
        name: item.name,
        thumbUrl: item.thumbUrl || '',
        price: item.price,
        categoryCode: '',
        categoryName: '',
        description: '',
        stockAvailable: item.stockAvailable ?? 1,
      },
    })
    try {
      const detail = await getDrinkDetail(item.productId)
      if (detail && this.data.showDrinkModal) {
        this.setData({ activeDrink: { ...this.data.activeDrink, ...detail } })
      }
    } catch { /* 静默失败，已显示基础信息 */ }
  },

  closeDrinkModal() {
    this.setData({ showDrinkModal: false, activeDrink: null })
  },

  async addDrinkToCart(e) {
    const drink = e.currentTarget.dataset.drink
    if (!drink) return
    if ((drink.stockAvailable ?? 1) <= 0) {
      wx.showToast({ title: '该饮品已售罄', icon: 'none' })
      return
    }
    try {
      await addToCart({ productType: 'drink', productId: drink.id, spec: '单份', qty: 1 })
      wx.showToast({ title: '已加入购物车', icon: 'none' })
      this.setData({ showDrinkModal: false, activeDrink: null })
      this._loadCart()
    } catch { /* 错误已在 request 层处理 */ }
  },

  async orderDrinkNow(e) {
    const drink = e.currentTarget.dataset.drink
    if (!drink) return
    if ((drink.stockAvailable ?? 1) <= 0) {
      wx.showToast({ title: '该饮品已售罄', icon: 'none' })
      return
    }
    try {
      await addToCart({ productType: 'drink', productId: drink.id, spec: '单份', qty: 1 })
      this.setData({ showDrinkModal: false, activeDrink: null })
      wx.navigateTo({ url: '/pages/checkout/checkout' })
    } catch { /* 错误已在 request 层处理 */ }
  },
})
