const { getCigarDetail, getCigarReviews, addToCart, submitReview } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

const EMBER_KEYWORDS = ['木质', '木香', '烟草', '皮革', '泥炭', '雪松', '辛辣', '辛香', '火烤']

Page({
  data: {
    cigar: null,
    scrollTop: 0,
    heroOpacity: 1,
    showEmbers: false,

    reviews: [],
    reviewMeta: { avgScore: 0, totalCount: 0 },
    reviewPage: 1,
    reviewHasMore: true,
    reviewLoading: false,

    isLoggedIn: false,
    showReviewModal: false,
    myRating: 0,
    reviewText: '',
    submittingReview: false,

    showDrinkModal: false,
    activeDrink: null,
  },

  onLoad(options) {
    this._cigarId = options.id || '1'
    this.setData({ isLoggedIn: isLoggedIn() })
    this._loadCigar(this._cigarId)
    this._loadReviews(this._cigarId, 1)
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  onReachBottom() {
    if (this.data.reviewHasMore && !this.data.reviewLoading) {
      this._loadReviews(this._cigarId, this.data.reviewPage + 1)
    }
  },

  async _loadCigar(id) {
    try {
      const cigar = await getCigarDetail(id)
      if (cigar) {
        const showEmbers = EMBER_KEYWORDS.some(k =>
          (cigar.tags || []).some(t => t.includes(k))
        ) || (cigar.scores && (cigar.scores['木香'] >= 60 || cigar.scores['烟草'] >= 70))

        this.setData({ cigar, showEmbers })
      } else {
        wx.showToast({ title: '雪茄不存在', icon: 'none' })
      }
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async _loadReviews(id, page = 1) {
    if (this.data.reviewLoading) return
    this.setData({ reviewLoading: true })
    try {
      const res = await getCigarReviews(id, { page, pageSize: 10 })
      if (res && res.list) {
        const newList = page === 1
          ? res.list
          : [...this.data.reviews, ...res.list]
        const total = res.total || newList.length
        this.setData({
          reviews: newList,
          reviewPage: page,
          reviewHasMore: newList.length < total,
          reviewLoading: false,
          reviewMeta: {
            avgScore: total > 0
              ? (res.avgScore || (newList.reduce((s, r) => s + r.rating, 0) / newList.length)).toFixed(1)
              : 0,
            totalCount: total,
          }
        })
      }
    } catch {
      this.setData({ reviewLoading: false })
    }
  },

  async onPullDownRefresh() {
    await Promise.all([
      this._loadCigar(this._cigarId),
      this._loadReviews(this._cigarId, 1),
    ])
    wx.stopPullDownRefresh()
  },

  onPageScroll(e) {
    const opacity = Math.max(0, 1 - e.scrollTop / 300)
    this.setData({ heroOpacity: opacity })
  },

  async addToCart() {
    wx.vibrateShort({ type: 'light' })

    if (!isLoggedIn()) {
      getApp().promptLogin({ message: '加入购物车前请先登录' })
      return
    }

    const { cigar } = this.data
    if (!cigar) return

    try {
      await addToCart({ productType: 'cigar', productId: cigar.id, spec: '单支', qty: 1, _name: cigar.name, _price: cigar.price, _thumbUrl: cigar.thumbUrl })
      wx.showToast({ title: '已加入购物车', icon: 'none' })
      getApp().updateCartBadge((getApp().globalData.cartCount || 0) + 1)
    } catch {
      // 错误提示已在 request 层处理
    }
  },

  viewRelated(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/cigar-detail/cigar-detail?id=${id}` })
  },

  /* ════════ 配饮 ════════ */

  viewDrinkDetail(e) {
    const { drink } = e.currentTarget.dataset
    this.setData({ showDrinkModal: true, activeDrink: drink })
  },

  closeDrinkModal() {
    this.setData({ showDrinkModal: false, activeDrink: null })
  },

  async addDrinkToCart(e) {
    const drink = e.currentTarget.dataset.drink
    if (!drink) return
    wx.vibrateShort({ type: 'light' })

    if (!isLoggedIn()) {
      getApp().promptLogin({ message: '加入购物车前请先登录' })
      return
    }
    if ((drink.stockAvailable ?? 1) <= 0) {
      wx.showToast({ title: '该配饮已售罄', icon: 'none' })
      return
    }

    try {
      await addToCart({ productType: 'drink', productId: drink.id, spec: '单份', qty: 1, _name: drink.name, _price: drink.price, _thumbUrl: drink.thumbUrl })
      wx.showToast({ title: '已加入购物车', icon: 'none' })
      this.setData({ showDrinkModal: false, activeDrink: null })
      const app = getApp()
      getApp().updateCartBadge((app.globalData.cartCount || 0) + 1)
    } catch {
      // 错误已在 request 层处理
    }
  },

  async orderDrinkNow(e) {
    const drink = e.currentTarget.dataset.drink
    if (!drink) return

    if (!isLoggedIn()) {
      getApp().promptLogin({ message: '立即下单前请先登录' })
      return
    }
    if ((drink.stockAvailable ?? 1) <= 0) {
      wx.showToast({ title: '该配饮已售罄', icon: 'none' })
      return
    }

    try {
      await addToCart({ productType: 'drink', productId: drink.id, spec: '单份', qty: 1 })
      this.setData({ showDrinkModal: false, activeDrink: null })
      wx.navigateTo({ url: '/pages/cart/cart' })
    } catch {
      // 错误已在 request 层处理
    }
  },

  /* ════════ 评论 Modal ════════ */

  openReviewModal() {
    if (!isLoggedIn()) {
      getApp().promptLogin({ message: '发表评价前请先登录' })
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

  async submitReview() {
    const { myRating, reviewText, cigar, submittingReview } = this.data

    if (submittingReview) return

    if (myRating === 0) {
      wx.showToast({ title: '请先为雪茄打分', icon: 'none' })
      return
    }
    if (!reviewText.trim()) {
      wx.showToast({ title: '请填写品鉴内容', icon: 'none' })
      return
    }

    this.setData({ submittingReview: true })

    try {
      await submitReview({
        cigarId: Number(cigar.id),
        rating: myRating,
        content: reviewText.trim(),
        // orderId 可选，无订单时也允许发表品鉴
      })

      wx.showToast({ title: '评价发布成功', icon: 'success', duration: 1800 })
      this.setData({ showReviewModal: false, submittingReview: false })

      // 从第一页刷新评价列表
      this._loadReviews(cigar.id, 1)
    } catch (err) {
      this.setData({ submittingReview: false })
      // 敏感词拦截等错误由 request 层显示
      if (err.message && err.message.includes('敏感词')) {
        wx.showToast({ title: '内容含有敏感词，请修改后重试', icon: 'none', duration: 2500 })
      }
    }
  }
})
