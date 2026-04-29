const QUESTIONS = [
  {
    id: 1,
    question: '您通常在什么场合享用雪茄？',
    type: 'single',
    options: ['商务会谈', '独处休闲', '朋友聚会', '庆祝特殊场合']
  },
  {
    id: 2,
    question: '您偏好哪种雪茄强度？',
    type: 'single',
    options: ['轻柔温和', '均衡适中', '浓郁丰厚', '醇厚强劲']
  },
  {
    id: 3,
    question: '您喜欢哪些风味特征？（可多选）',
    type: 'multi',
    options: ['果香甜润', '木质烟草', '泥土矿物', '咖啡可可', '辛香胡椒', '奶油丝滑']
  },
  {
    id: 4,
    question: '您计划品鉴多长时间？',
    type: 'single',
    options: ['30 分钟以内', '30–60 分钟', '1–2 小时', '悠然不限']
  },
  {
    id: 5,
    question: '您的雪茄品鉴经验如何？',
    type: 'single',
    options: ['初次尝试', '偶尔品鉴', '资深爱好者', '专业玩家']
  }
]

const MOCK_RESULTS = [
  {
    id: 1,
    name: 'Cohiba Behike 52',
    origin: '古巴',
    year: '2022',
    strength: '均衡',
    duration: '约 60 分钟',
    price: 1280,
    rating: 97,
    tags: ['咖啡', '木质', '奶油'],
    scores: { 果香: 40, 木香: 75, 烟草: 85, 辛辣: 55, 土壤: 65, 甜感: 60 },
    match: 98
  },
  {
    id: 2,
    name: 'Davidoff Winston Churchill',
    origin: '多米尼加',
    year: '2021',
    strength: '中等',
    duration: '约 45 分钟',
    price: 680,
    rating: 94,
    tags: ['果香', '木质', '辛香'],
    scores: { 果香: 65, 木香: 70, 烟草: 60, 辛辣: 45, 土壤: 50, 甜感: 75 },
    match: 94
  },
  {
    id: 3,
    name: 'Arturo Fuente OpusX',
    origin: '多米尼加',
    year: '2022',
    strength: '浓郁',
    duration: '约 90 分钟',
    price: 960,
    rating: 96,
    tags: ['皮革', '木质', '泥土'],
    scores: { 果香: 30, 木香: 80, 烟草: 90, 辛辣: 70, 土壤: 85, 甜感: 35 },
    match: 91
  }
]

Page({
  data: {
    // 'welcome' | 'qa' | 'loading' | 'result'
    stage: 'welcome',
    currentQ: 0,
    questions: QUESTIONS,
    answers: {},
    results: [],
    cardAnimClass: 'card-enter',
    welcomeVisible: true
  },

  onShow() {
    getApp().globalData.selectedTab = 0
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  startQA() {
    this.setData({ stage: 'qa', currentQ: 0, cardAnimClass: 'card-enter' })
  },

  onAnswer(e) {
    const { optionIndex } = e.detail
    const { currentQ, questions, answers } = this.data
    const q = questions[currentQ]
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

  submitQA() {
    this.setData({ stage: 'loading' })
    setTimeout(() => {
      this.setData({ stage: 'result', results: MOCK_RESULTS })
    }, 2200)
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${id}` })
  },

  addToCart(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '已加入购物车', icon: 'none', duration: 1500 })
    const bar = this.getTabBar && this.getTabBar()
    if (bar) {
      const count = (bar.data.cartCount || 0) + 1
      bar.setData({ cartCount: count })
    }
  },

  restart() {
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
