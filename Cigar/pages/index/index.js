const { getRecommendQuestions, getRecommendations, addToCart } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

Page({
  data: {
    stage: 'welcome',
    currentQ: 0,
    questions: [],
    answers: {},
    results: [],
    cardAnimClass: 'card-enter',
    welcomeVisible: true,
    loadingText: 'AI 正在为您匹配最佳雪茄...',
    loadError: false,
    loginModalVisible: false,
  },

  onShow() {
    getApp().globalData.selectedTab = 0
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }

    // 恢复上次推荐结果（会话级持久化，退出应用自动清除）
    const saved = getApp().globalData.recommendState
    if (saved && saved.stage === 'result') {
      if (this.data.stage !== 'result') {
        this.setData({ stage: saved.stage, results: saved.results })
      }
      return
    }

    if (this.data.questions.length === 0) {
      this._loadQuestions()
    }

    // 进入小程序时检查登录状态，未登录则延迟 800ms 弹出登录提示
    if (!isLoggedIn() && !this._loginPrompted) {
      this._loginPrompted = true
      setTimeout(() => {
        if (!isLoggedIn()) {
          this.setData({ loginModalVisible: true })
        }
      }, 800)
    }
  },

  onLoginModalClose() {
    this.setData({ loginModalVisible: false })
  },

  onLoginSuccess() {
    this.setData({ loginModalVisible: false })
  },

  async _loadQuestions() {
    this.setData({ loadError: false })
    try {
      const questions = await getRecommendQuestions()
      if (questions && questions.length > 0) {
        this.setData({ questions, loadError: false })
      } else {
        this.setData({ loadError: true })
      }
    } catch {
      this.setData({ loadError: true })
    }
  },

  retryLoad() {
    this._loadQuestions()
  },

  async onPullDownRefresh() {
    await this._loadQuestions()
    wx.stopPullDownRefresh()
  },

  startQA() {
    const { questions } = this.data
    if (questions.length === 0) {
      wx.showToast({ title: '推荐问题加载中，请稍后', icon: 'none' })
      return
    }
    this.setData({ stage: 'qa', currentQ: 0, cardAnimClass: 'card-enter' })
  },

  onAnswer(e) {
    const { optionIndex } = e.detail
    const { currentQ, questions, answers } = this.data
    const q = questions[currentQ]
    if (!q) return
    wx.vibrateShort({ type: 'light' })

    let newAnswers = { ...answers }
    if (q.type === 'single') {
      newAnswers[q.id] = [optionIndex]
    } else {
      const prev = newAnswers[q.id] || []
      const idx = prev.indexOf(optionIndex)
      if (idx === -1) {
        newAnswers[q.id] = [...prev, optionIndex]
      } else {
        newAnswers[q.id] = prev.filter(i => i !== idx)
      }
    }
    this.setData({ answers: newAnswers })
  },

  nextQuestion() {
    const { currentQ, questions } = this.data
    this.setData({ cardAnimClass: 'card-exit' })
    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        this.submitQA()
      } else {
        this.setData({
          currentQ: currentQ + 1,
          cardAnimClass: 'card-enter'
        })
      }
    }, 280)
  },

  async submitQA() {
    const { answers, questions } = this.data
    this.setData({ stage: 'loading' })

    // 组装答案格式
    const answerList = []
    for (const [qId, indices] of Object.entries(answers)) {
      for (const idx of indices) {
        answerList.push({
          questionId: Number(qId),
          optionIndex: idx,
        })
      }
    }

    try {
      const results = await getRecommendations(answerList)
      if (results && results.length > 0) {
        this.setData({ stage: 'result', results })
        getApp().globalData.recommendState = { stage: 'result', results }
      } else {
        this.setData({ stage: 'result', results: [] })
        getApp().globalData.recommendState = { stage: 'result', results: [] }
        wx.showToast({ title: '暂无匹配结果，请调整偏好重试', icon: 'none' })
      }
    } catch {
      this.setData({ stage: 'welcome' })
      wx.showToast({ title: '推荐服务暂不可用', icon: 'none' })
    }
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${id}` })
  },

  async addToCart(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })

    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none', duration: 2000 })
      return
    }

    try {
      await addToCart({ productType: 'cigar', productId: id, spec: '单支', qty: 1 })
      wx.showToast({ title: '已加入购物车', icon: 'none', duration: 1500 })
      const app = getApp()
      getApp().updateCartBadge((app.globalData.cartCount || 0) + 1)
    } catch {
      // 错误提示已在 request 层处理
    }
  },

  restart() {
    getApp().globalData.recommendState = null
    this.setData({ stage: 'welcome', currentQ: 0, answers: {}, results: [] })
  },

  onShareAppMessage() {
    return {
      title: 'GOAT CIGAR CLUB - 发现属于你的专属雪茄',
      path: '/pages/index/index',
      imageUrl: '/images/pure_img.png'
    }
  }
})
