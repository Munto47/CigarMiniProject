const { getHistory, sortByTimeDesc } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

const FILTER_TABS = ['全部', '已购', '生成海报']
const FILTER_MAP = { 0: 'all', 1: 'purchased', 2: 'poster' }

Page({
  data: {
    activeFilter: 0,
    filterTabs: FILTER_TABS,
    groups: [],
    loading: true,
    allGroups: [],
    page: 1,
    hasMore: true,
  },

  onShow() {
    getApp().globalData.selectedTab = 3
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this._loadHistory(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadHistory(false)
    }
  },

  async _loadHistory(reset = true) {
    if (!isLoggedIn()) {
      this.setData({ loading: false, groups: [] })
      return
    }
    if (this.data.loading && !reset) return
    this.setData({ loading: true })

    const page = reset ? 1 : this.data.page
    try {
      const groups = await getHistory({ page, pageSize: 30 })
      const total = groups.reduce((s, g) => s + g.records.length, 0)

      let allGroups
      if (reset) {
        allGroups = groups
      } else {
        // 合并日期分组
        allGroups = [...this.data.allGroups]
        groups.forEach(g => {
          const existing = allGroups.find(ag => ag.date === g.date)
          if (existing) {
            existing.records = sortByTimeDesc([...existing.records, ...g.records])
          } else {
            allGroups.push(g)
          }
        })
        allGroups.sort((a, b) => b.date.localeCompare(a.date))
      }

      this.setData({
        allGroups,
        loading: false,
        page: page + 1,
        hasMore: total >= 30,
      })
      this._applyFilter(this.data.activeFilter)
    } catch {
      this.setData({ loading: false })
    }
  },

  switchFilter(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ activeFilter: idx })
    this._applyFilter(idx)
  },

  _applyFilter(filterIdx) {
    const { allGroups } = this.data

    if (filterIdx === 0) {
      this.setData({ groups: allGroups })
      return
    }

    const filterType = FILTER_MAP[filterIdx]
    const filtered = allGroups
      .map(g => ({
        date: g.date,
        records: g.records.filter(r => r.type === filterType),
      }))
      .filter(g => g.records.length > 0)

    this.setData({ groups: filtered })
  },

  async onPullDownRefresh() {
    await this._loadHistory(true)
    wx.stopPullDownRefresh()
  },

  viewDetail(e) {
    const { cigarId } = e.currentTarget.dataset
    if (!cigarId) {
      wx.showToast({ title: '暂无雪茄详情', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${cigarId}` })
  },

  reorder(e) {
    wx.vibrateShort({ type: 'light' })
    const { cigarId, name } = e.currentTarget.dataset
    if (!cigarId) {
      wx.showToast({ title: '无法重新购买', icon: 'none' })
      return
    }
    const { addToCart } = require('../../utils/api')
    if (!isLoggedIn()) {
      getApp().promptLogin({ message: '重新购买前请先登录' })
      return
    }
    addToCart({ productType: 'cigar', productId: cigarId, spec: '单支', qty: 1, _name: name })
      .then(() => wx.showToast({ title: '已加入购物车', icon: 'none' }))
      .catch(() => {})
  },

  shareRecord(e) {
    const { cigarId } = e.currentTarget.dataset
    if (!cigarId) {
      wx.showToast({ title: '请先为此记录关联雪茄', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/poster/poster?cigarId=${cigarId}` })
  },

  onShareAppMessage() {
    return {
      title: 'GOAT CIGAR CLUB - 我的品鉴记录',
      path: '/pages/history/history',
      imageUrl: '/images/pure_img.png'
    }
  },
})
