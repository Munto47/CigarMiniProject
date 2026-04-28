const FLAVOR_TAGS = [
  '果香甜润', '木质烟草', '泥土矿物', '咖啡可可',
  '辛香胡椒', '奶油丝滑', '皮革木桶', '花香清雅',
  '坚果焦糖', '香草甜美', '泥炭烟熏', '雪松丝绸'
]

const DEFAULT_SCORES = { 果香: 0, 木香: 0, 烟草: 0, 辛辣: 0, 土壤: 0, 甜感: 0 }

const TAG_SCORE_MAP = {
  '果香甜润': { 果香: 80, 甜感: 60 },
  '木质烟草': { 木香: 80, 烟草: 70 },
  '泥土矿物': { 土壤: 85, 烟草: 40 },
  '咖啡可可': { 甜感: 50, 木香: 60, 烟草: 55 },
  '辛香胡椒': { 辛辣: 85, 木香: 40 },
  '奶油丝滑': { 甜感: 75, 果香: 45 },
  '皮革木桶': { 木香: 75, 土壤: 60, 烟草: 65 },
  '花香清雅': { 果香: 70, 甜感: 65 },
  '坚果焦糖': { 甜感: 70, 木香: 50 },
  '香草甜美': { 甜感: 90, 果香: 55 },
  '泥炭烟熏': { 土壤: 90, 烟草: 80, 辛辣: 55 },
  '雪松丝绸': { 木香: 90, 果香: 35, 甜感: 40 }
}

Page({
  data: {
    tags: FLAVOR_TAGS.map(t => ({ label: t, selected: false })),
    scores: { ...DEFAULT_SCORES },
    hasResult: false
  },

  onShow() {
    getApp().globalData.selectedTab = 1
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  onToggleTag(e) {
    const { label } = e.detail
    const tags = this.data.tags.map(t =>
      t.label === label ? { ...t, selected: !t.selected } : t
    )
    this.setData({ tags })
    this._calcScores(tags)
  },

  _calcScores(tags) {
    const scores = { ...DEFAULT_SCORES }
    tags.filter(t => t.selected).forEach(t => {
      const s = TAG_SCORE_MAP[t.label] || {}
      Object.keys(s).forEach(k => {
        scores[k] = Math.min(100, (scores[k] || 0) + s[k])
      })
    })
    const hasResult = tags.some(t => t.selected)
    this.setData({ scores, hasResult })
  },

  generatePoster() {
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  addToHistory() {
    wx.showToast({ title: '已加入品鉴记录', icon: 'none' })
  },

  resetAll() {
    this.setData({
      tags: FLAVOR_TAGS.map(t => ({ label: t, selected: false })),
      scores: { ...DEFAULT_SCORES },
      hasResult: false
    })
  }
})
