Component({
  data: {
    selected: 0,
    cartCount: 0,
    tabs: [
      { key: 'ai',      text: 'AI 推荐',  path: '/pages/index/index' },
      { key: 'flavor',  text: '风味生成', path: '/pages/flavor/flavor' },
      { key: 'cart',    text: '购物车',   path: '/pages/cart/cart' },
      { key: 'history', text: '历史记录', path: '/pages/history/history' },
      { key: 'club',    text: '会员中心', path: '/pages/club/club' }
    ]
  },

  attached() {
    const { selectedTab } = getApp().globalData
    this.setData({ selected: selectedTab })
  },

  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      if (index === this.data.selected) return
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})
