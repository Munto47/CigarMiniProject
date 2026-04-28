const MOCK_CART = [
  { id: 1, name: 'Cohiba Behike 52', spec: '单支', price: 1280, qty: 1 },
  { id: 2, name: 'Davidoff Winston Churchill', spec: '单支', price: 680, qty: 2 }
]

Page({
  data: {
    items: MOCK_CART,
    isEmpty: false,
    total: MOCK_CART.reduce((s, i) => s + i.price * i.qty, 0)
  },

  onShow() {
    getApp().globalData.selectedTab = 2
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    const isEmpty = this.data.items.length === 0
    this.setData({ isEmpty })
  },

  _calcTotal(items) {
    return items.reduce((s, i) => s + i.price * i.qty, 0)
  },

  changeQty(e) {
    const { id, delta } = e.currentTarget.dataset
    const items = this.data.items.map(item => {
      if (item.id !== id) return item
      const newQty = item.qty + delta
      return newQty < 1 ? null : { ...item, qty: newQty }
    }).filter(Boolean)
    this.setData({ items, isEmpty: items.length === 0, total: this._calcTotal(items) })
    this._syncBadge(items.reduce((s, i) => s + i.qty, 0))
  },

  removeItem(e) {
    const { id } = e.currentTarget.dataset
    const items = this.data.items.filter(i => i.id !== id)
    this.setData({ items, isEmpty: items.length === 0, total: this._calcTotal(items) })
    this._syncBadge(items.reduce((s, i) => s + i.qty, 0))
  },

  _syncBadge(count) {
    const bar = this.getTabBar && this.getTabBar()
    if (bar) bar.setData({ cartCount: count })
  },

  checkout() {
    if (this.data.isEmpty) return
    wx.navigateTo({ url: '/pages/checkout/checkout' })
  }
})
