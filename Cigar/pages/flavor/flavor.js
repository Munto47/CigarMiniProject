const { getFlavorTags, matchCigarByFlavors } = require('../../utils/api')

// 本地风味标签到评分的映射（作为后备和补充）
const DEFAULT_TAG_SCORE_MAP = {
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
  '雪松丝绸': { 木香: 90, 果香: 35, 甜感: 40 },
}

const DEFAULT_SCORES = { 果香: 0, 木香: 0, 烟草: 0, 辛辣: 0, 土壤: 0, 甜感: 0 }

Page({
  data: {
    tags: [],
    scores: { ...DEFAULT_SCORES },
    hasResult: false,
  },

  async onShow() {
    getApp().globalData.selectedTab = 1
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }

    if (this.data.tags.length === 0) {
      this._loadTags()
    }
  },

  async _loadTags() {
    try {
      const tags = await getFlavorTags()
      if (tags && tags.length > 0) {
        this.setData({
          tags: tags.map(t => ({
            label: t.name || t.label,
            selected: false,
            scoreMap: t.scoreMap || null,
          })),
        })
      } else {
        this._useDefaultTags()
      }
    } catch {
      this._useDefaultTags()
    }
  },

  _useDefaultTags() {
    const defaultTags = Object.keys(DEFAULT_TAG_SCORE_MAP)
    this.setData({
      tags: defaultTags.map(t => ({ label: t, selected: false })),
    })
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
      // 使用后端 scoreMap 或本地映射
      const s = t.scoreMap || DEFAULT_TAG_SCORE_MAP[t.label] || {}
      Object.keys(s).forEach(k => {
        scores[k] = Math.min(100, (scores[k] || 0) + s[k])
      })
    })
    const hasResult = tags.some(t => t.selected)
    this.setData({ scores, hasResult })
  },

  async generatePoster() {
    const selectedTags = this.data.tags.filter(t => t.selected)
    if (selectedTags.length === 0) {
      wx.showToast({ title: '请先选择风味标签', icon: 'none' })
      return
    }
    const tags = selectedTags.map(t => t.label)

    wx.showLoading({ title: '匹配雪茄中...', mask: true })
    const matchedCigar = await matchCigarByFlavors(tags)
    wx.hideLoading()

    // 自动写入海报生成记录
    const { createPoster } = require('../../utils/api')
    createPoster({
      cigarId: matchedCigar ? matchedCigar.id : undefined,
      cigarName: matchedCigar ? matchedCigar.name : undefined,
      flavorTags: tags,
      flavorScores: this.data.scores,
    }).catch(() => {})

    getApp().globalData.posterFlavorSaved = true
    getApp().globalData.posterFlavors = {
      tags: tags.slice(0, 3),
      scores: this.data.scores,
      matchedCigar,
    }
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  goToVoiceAnalysis() {
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  resetAll() {
    this.setData({
      tags: this.data.tags.map(t => ({ ...t, selected: false })),
      scores: { ...DEFAULT_SCORES },
      hasResult: false,
    })
  }
})
