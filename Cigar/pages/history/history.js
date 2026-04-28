const MOCK_HISTORY = [
  {
    date: '2024-06-18',
    records: [
      { id: 1, name: 'Cohiba Behike 52', origin: '古巴', tags: ['咖啡', '木质'], rating: 97, type: 'tasted' },
      { id: 2, name: 'Montecristo No.2', origin: '古巴', tags: ['坚果', '奶油'], rating: 93, type: 'poster' }
    ]
  },
  {
    date: '2024-06-12',
    records: [
      { id: 3, name: 'Davidoff Winston Churchill', origin: '多米尼加', tags: ['果香', '辛香'], rating: 94, type: 'purchased' }
    ]
  }
]

const FILTER_TABS = ['全部', '已购', '收藏', '生成海报']

Page({
  data: {
    activeFilter: 0,
    filterTabs: FILTER_TABS,
    groups: MOCK_HISTORY
  },

  onShow() {
    getApp().globalData.selectedTab = 3
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  switchFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.index })
  },

  viewDetail(e) {
    wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${e.currentTarget.dataset.id}` })
  },

  reorder(e) {
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '已加入购物车', icon: 'none' })
  },

  shareRecord(e) {
    wx.showToast({ title: '海报生成中...', icon: 'none' })
  }
})
