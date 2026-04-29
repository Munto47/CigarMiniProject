/* ── 触发火星特效的风味关键词 ── */
const EMBER_KEYWORDS = ['木质', '木香', '烟草', '皮革', '泥炭', '雪松', '辛辣', '辛香', '火烤']

/* ── 前端 Mock 敏感词列表 ── */
const SENSITIVE_WORDS = ['测试违规词', '违规', '敏感内容', '广告', '刷单']

/* ── Mock 评论数据 ── */
const MOCK_REVIEWS = [
  {
    id: 1,
    avatar: '林',
    name: '林先生',
    rating: 5,
    rechargeLevel: 8,
    consumeLevel: 7,
    time: '2024-06-18',
    content: '极致的品鉴体验，前段奶油清爽，中段木质与咖啡交织，层次之丰富令人叹服。尾段余韵悠长绵密。配上格兰菲迪18年简直是人生享受。'
  },
  {
    id: 2,
    avatar: '陈',
    name: 'C. Thompson',
    rating: 4,
    rechargeLevel: 5,
    consumeLevel: 6,
    time: '2024-06-12',
    content: '作为 Cohiba 深度爱好者，Behike 52 确实代表古巴雪茄高峰。烟气细腻复杂，但包叶稍紧，影响了一点通气感。总体仍是四星半水准。'
  },
  {
    id: 3,
    avatar: '王',
    name: '王先生',
    rating: 5,
    rechargeLevel: 9,
    consumeLevel: 9,
    time: '2024-06-05',
    content: '第一次品鉴 Behike 系列，被其独特的 Medio Tiempo 叶彻底折服。强度均衡却层次感超越任何我品鉴过的古巴雪茄，值得每一分价格。'
  }
]

/* ── Mock 雪茄数据 ── */
const MOCK_CIGARS = {
  1: {
    id: 1,
    name: 'Cohiba Behike 52',
    origin: '古巴 · 哈瓦那',
    year: '2022',
    strength: '均衡',
    duration: '约 60 分钟',
    price: 1280,
    rating: 97,
    wrapper: '科罗霍科罗纳包叶',
    tags: ['咖啡', '木质', '奶油'],
    scores: { 果香: 40, 木香: 75, 烟草: 85, 辛辣: 55, 土壤: 65, 甜感: 60 },
    segments: [
      { name: '前段（0–15 分钟）', desc: '入口即感草本清香，淡淡的奶油底调浮现，烟气细腻顺滑。' },
      { name: '中段（15–45 分钟）', desc: '核心风味展开，浓郁木质与咖啡香交织，辛香微辣画龙点睛。' },
      { name: '尾段（45–60 分钟）', desc: '收尾回甘明显，余韵悠长，带着淡淡皮革与甜感余音。' }
    ],
    pairings: [
      { name: '格兰菲迪 18 年', type: '威士忌', desc: '木桶与咖啡相得益彰' },
      { name: '蓝山单品', type: '咖啡', desc: '果酸衬托奶油质感' },
      { name: '大红袍', type: '茶', desc: '炭香与烟草共鸣' }
    ],
    related: [
      { id: 2, name: 'Davidoff Winston Churchill', price: 680, rating: 94 },
      { id: 3, name: 'Arturo Fuente OpusX', price: 960, rating: 96 }
    ]
  },
  2: {
    id: 2,
    name: 'Davidoff Winston Churchill',
    origin: '多米尼加',
    year: '2021',
    strength: '中等',
    duration: '约 45 分钟',
    price: 680,
    rating: 94,
    wrapper: '厄瓜多尔太阳叶',
    tags: ['果香', '木质', '辛香'],
    scores: { 果香: 65, 木香: 70, 烟草: 60, 辛辣: 45, 土壤: 50, 甜感: 75 },
    segments: [
      { name: '前段（0–10 分钟）', desc: '清新果香开场，甜感明显，入口轻盈舒适。' },
      { name: '中段（10–35 分钟）', desc: '木质底调渐渐浮现，与果甜形成优雅对话。' },
      { name: '尾段（35–45 分钟）', desc: '辛香微妙收尾，余韵干净，适合商务场合。' }
    ],
    pairings: [
      { name: '轩尼诗 VSOP', type: '干邑', desc: '果香与葡萄蒸馏酒共鸣' },
      { name: '矿泉水', type: '饮品', desc: '清洁味觉，不干扰风味' }
    ],
    related: [
      { id: 1, name: 'Cohiba Behike 52', price: 1280, rating: 97 },
      { id: 3, name: 'Arturo Fuente OpusX', price: 960, rating: 96 }
    ]
  },
  3: {
    id: 3,
    name: 'Arturo Fuente OpusX',
    origin: '多米尼加',
    year: '2022',
    strength: '浓郁',
    duration: '约 90 分钟',
    price: 960,
    rating: 96,
    wrapper: '多米尼加深色包叶',
    tags: ['皮革', '木质', '泥土'],
    scores: { 果香: 30, 木香: 80, 烟草: 90, 辛辣: 70, 土壤: 85, 甜感: 35 },
    segments: [
      { name: '前段（0–20 分钟）', desc: '浓郁皮革与大地气息扑面，开场强劲有力。' },
      { name: '中段（20–65 分钟）', desc: '重烟草与深木质交织，辛辣感明显，需有一定品鉴经验。' },
      { name: '尾段（65–90 分钟）', desc: '厚重余韵经久不散，是真正为"老手"准备的雪茄。' }
    ],
    pairings: [
      { name: '麦卡伦 25 年', type: '威士忌', desc: '厚重与厚重的对话' },
      { name: '浓缩咖啡', type: '咖啡', desc: '苦感相互激发' }
    ],
    related: [
      { id: 1, name: 'Cohiba Behike 52', price: 1280, rating: 97 },
      { id: 2, name: 'Davidoff Winston Churchill', price: 680, rating: 94 }
    ]
  }
}

Page({
  data: {
    cigar: null,
    scrollTop: 0,
    heroOpacity: 1,
    showEmbers: false,

    /* ── 评论数据 ── */
    reviews: MOCK_REVIEWS,
    reviewMeta: { avgScore: 4.7, totalCount: 128 },

    /* ── 评论 Modal ── */
    isLoggedIn: true,    // Mock：当前已登录
    showReviewModal: false,
    myRating: 0,
    reviewText: ''
  },

  onLoad(options) {
    const id    = parseInt(options.id || 1)
    const cigar = MOCK_CIGARS[id] || MOCK_CIGARS[1]

    /* 根据风味标签或分值判断是否显示火星特效 */
    const showEmbers = EMBER_KEYWORDS.some(k =>
      (cigar.tags || []).some(t => t.includes(k))
    ) || cigar.scores['木香'] >= 60 || cigar.scores['烟草'] >= 70

    this.setData({ cigar, showEmbers })
  },

  onPageScroll(e) {
    const opacity = Math.max(0, 1 - e.scrollTop / 300)
    this.setData({ heroOpacity: opacity })
  },

  addToCart() {
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '已加入购物车', icon: 'none' })
  },

  viewRelated(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${id}` })
  },

  /* ════════ 评论 Modal ════════ */

  openReviewModal() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none', duration: 2000 })
      return
    }
    this.setData({ showReviewModal: true, myRating: 0, reviewText: '' })
  },

  closeReviewModal() {
    this.setData({ showReviewModal: false })
  },

  onMyRatingChange(e) {
    this.setData({ myRating: e.detail.value })
  },

  onReviewInput(e) {
    this.setData({ reviewText: e.detail.value })
  },

  submitReview() {
    const { myRating, reviewText } = this.data

    if (myRating === 0) {
      wx.showToast({ title: '请先为雪茄打分', icon: 'none' })
      return
    }
    if (!reviewText.trim()) {
      wx.showToast({ title: '请填写品鉴内容', icon: 'none' })
      return
    }

    /* 前端 Mock 敏感词过滤 */
    const hit = SENSITIVE_WORDS.find(w => reviewText.includes(w))
    if (hit) {
      wx.showToast({ title: '内容含有敏感词，请修改后重试', icon: 'none', duration: 2500 })
      return
    }

    /* Mock 成功：将新评论插入列表首位，附带当前用户等级 */
    const newReview = {
      id:      Date.now(),
      avatar:  '我',
      name:    '您（Mock）',
      rating:  myRating,
      rechargeLevel: 6,
      consumeLevel: 5,
      time:    new Date().toISOString().slice(0, 10),
      content: reviewText.trim()
    }
    this.setData({
      reviews:         [newReview, ...this.data.reviews],
      showReviewModal: false
    })
    wx.showToast({ title: '评价发布成功', icon: 'success' })
  }
})
