require('../setup')

const mockGetCigarDetail = jest.fn()
const mockGetCigarReviews = jest.fn()
const mockAddToCart = jest.fn()
const mockSubmitReview = jest.fn()
const mockIsLoggedIn = jest.fn()
const mockPromptLogin = jest.fn()

jest.mock('../../utils/api', () => ({
  getCigarDetail: mockGetCigarDetail,
  getCigarReviews: mockGetCigarReviews,
  addToCart: mockAddToCart,
  submitReview: mockSubmitReview,
}))
jest.mock('../../utils/request', () => ({ isLoggedIn: mockIsLoggedIn }))

global.getApp = () => ({ globalData: {}, promptLogin: mockPromptLogin, updateCartBadge: jest.fn() })

describe('pages/cigar-detail/cigar-detail', () => {
  let page
  beforeAll(() => {
    require('../../pages/cigar-detail/cigar-detail')
    page = global.Page.mock.calls.at(-1)[0]
  })
  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockIsLoggedIn.mockReturnValue(false)
    mockPromptLogin.mockResolvedValue(false)
    mockGetCigarDetail.mockResolvedValue({
      id: 1, name: '高希霸', tags: ['木质', '烟草'], scores: { 木香: 80, 烟草: 70 },
      price: 358, rating: 5,
    })
    mockGetCigarReviews.mockResolvedValue({
      list: [{ id: 1, rating: 4, content: '好' }], total: 1, avgScore: 4.0,
    })
    page.data = {
      cigar: null, reviews: [], reviewMeta: { avgScore: 0, totalCount: 0 },
      reviewPage: 1, reviewHasMore: true, reviewLoading: false,
      showReviewModal: false, myRating: 0, reviewText: '', submittingReview: false,
    }
  })

  describe('onLoad', () => {
    it('加载雪茄详情和评价', () => {
      page.onLoad({ id: '5' })
      expect(mockGetCigarDetail).toHaveBeenCalledWith('5')
      expect(mockGetCigarReviews).toHaveBeenCalledWith('5', { page: 1, pageSize: 10 })
    })

    it('默认 id 为 1', () => {
      page.onLoad({})
      expect(page._cigarId).toBe('1')
    })
  })

  describe('_loadCigar', () => {
    it('成功加载并检测 ember 效果', async () => {
      await page._loadCigar(1)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ cigar: expect.any(Object), showEmbers: true })
      )
    })

    it('无木香/烟草时不显示 ember', async () => {
      mockGetCigarDetail.mockResolvedValue({
        id: 2, name: '清淡', tags: ['果香'], scores: { 果香: 40 },
      })
      await page._loadCigar(2)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ showEmbers: false })
      )
    })

    it('雪茄不存在时提示', async () => {
      mockGetCigarDetail.mockResolvedValue(null)
      await page._loadCigar(1)
      expect(wx.showToast).toHaveBeenCalled()
    })

    it('加载失败时提示', async () => {
      mockGetCigarDetail.mockRejectedValue(new Error('fail'))
      await page._loadCigar(1)
      expect(wx.showToast).toHaveBeenCalled()
    })
  })

  describe('_loadReviews', () => {
    it('成功加载评价列表', async () => {
      await page._loadReviews(1)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ reviewMeta: expect.objectContaining({ totalCount: 1 }) })
      )
    })

    it('加载失败时结束 loading', async () => {
      mockGetCigarReviews.mockRejectedValue(new Error('fail'))
      await page._loadReviews(1)
      expect(page.setData).toHaveBeenCalledWith({ reviewLoading: false })
    })
  })

  describe('addToCart', () => {
    it('未登录时拉起登录提示', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      await page.addToCart()
      expect(mockPromptLogin).toHaveBeenCalledWith({ message: '加入购物车前请先登录' })
    })

    it('登录后加入购物车', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      page.data.cigar = { id: 5, name: '高希霸', price: 358, thumbUrl: '/a.jpg' }
      mockAddToCart.mockResolvedValue({})
      await page.addToCart()
      expect(mockAddToCart).toHaveBeenCalledWith(expect.objectContaining({
        productType: 'cigar', productId: 5, spec: '单支', qty: 1
      }))
    })
  })

  describe('Review Modal', () => {
    it('未登录时不可打开评价弹窗', () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.openReviewModal()
      expect(mockPromptLogin).toHaveBeenCalledWith({ message: '发表评价前请先登录' })
    })

    it('登录后打开评价弹窗', () => {
      mockIsLoggedIn.mockReturnValue(true)
      page.openReviewModal()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ showReviewModal: true })
      )
    })

    it('关闭弹窗', () => {
      page.closeReviewModal()
      expect(page.setData).toHaveBeenCalledWith({ showReviewModal: false })
    })

    it('未打分不能提交', async () => {
      page.data.myRating = 0
      await page.submitReview()
      expect(wx.showToast).toHaveBeenCalled()
    })

    it('提交评价成功', async () => {
      page.data = { ...page.data, myRating: 5, reviewText: '非常棒', cigar: { id: 10 }, submittingReview: false }
      mockSubmitReview.mockResolvedValue({})
      await page.submitReview()
      expect(mockSubmitReview).toHaveBeenCalled()
    })
  })
})
