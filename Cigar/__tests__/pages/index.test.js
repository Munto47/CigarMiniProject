/**
 * pages/index/index.test.js — 首页推荐流程测试
 */
require('../setup')

const mockGetRecommendQuestions = jest.fn()
const mockGetRecommendations = jest.fn()
const mockAddToCart = jest.fn()
const mockIsLoggedIn = jest.fn()

jest.mock('../../utils/api', () => ({
  getRecommendQuestions: mockGetRecommendQuestions,
  getRecommendations: mockGetRecommendations,
  addToCart: mockAddToCart,
}))

jest.mock('../../utils/request', () => ({
  isLoggedIn: mockIsLoggedIn,
}))

const mockUpdateCartBadge = jest.fn()
const mockApp = {
  globalData: { selectedTab: -1, cartCount: 0 },
  updateCartBadge: mockUpdateCartBadge,
}
global.getApp = () => mockApp

// TabBar mock
const mockTabBar = { setData: jest.fn() }

describe('pages/index/index', () => {
  let page

  beforeAll(() => {
    require('../../pages/index/index')
    page = global.Page.mock.calls.at(-1)[0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockGetRecommendQuestions.mockResolvedValue([
      { id: 1, question: '风味偏好', type: 'single', options: ['清淡', '浓郁'] },
      { id: 2, question: '预算', type: 'multi', options: ['100-300', '300+'] },
    ])
    mockGetRecommendations.mockResolvedValue([
      { id: 10, name: '推荐雪茄', price: 200, match: 85, thumbUrl: '/a.jpg' },
    ])
    mockIsLoggedIn.mockReturnValue(false)
    mockApp.globalData = { selectedTab: -1, cartCount: 0 }
  })

  describe('data 初始化', () => {
    it('stage 初始值为 welcome', () => {
      expect(page.data.stage).toBe('welcome')
      expect(page.data.currentQ).toBe(0)
      expect(page.data.questions).toEqual([])
      expect(page.data.answers).toEqual({})
      expect(page.data.results).toEqual([])
    })
  })

  describe('onShow', () => {
    it('设置 selectedTab 为 0', () => {
      page.getTabBar = () => mockTabBar
      page.onShow()
      expect(mockApp.globalData.selectedTab).toBe(0)
      expect(mockTabBar.setData).toHaveBeenCalledWith({ selected: 0 })
    })

    it('首次加载时自动拉取问题', () => {
      page.data.questions = []
      page.onShow()
      expect(mockGetRecommendQuestions).toHaveBeenCalled()
    })

    it('已有问题时不再拉取', () => {
      page.data.questions = [{ id: 1 }]
      page.onShow()
      expect(mockGetRecommendQuestions).not.toHaveBeenCalled()
    })
  })

  describe('_loadQuestions', () => {
    it('成功加载问题列表', async () => {
      page.setData = jest.fn()
      await page._loadQuestions()
      expect(page.setData).toHaveBeenCalledWith({ loadError: false, questions: expect.any(Array) })
    })

    it('空问题列表时设置 loadError', async () => {
      mockGetRecommendQuestions.mockResolvedValue([])
      page.setData = jest.fn()
      await page._loadQuestions()
      expect(page.setData).toHaveBeenCalledWith({ loadError: true })
    })

    it('接口异常时设置 loadError', async () => {
      mockGetRecommendQuestions.mockRejectedValue(new Error('fail'))
      page.setData = jest.fn()
      await page._loadQuestions()
      expect(page.setData).toHaveBeenCalledWith({ loadError: true })
    })
  })

  describe('startQA', () => {
    it('有问题时进入 QA 阶段', () => {
      page.data.questions = [{ id: 1 }]
      page.setData = jest.fn()
      page.startQA()
      expect(page.setData).toHaveBeenCalledWith({ stage: 'qa', currentQ: 0, cardAnimClass: 'card-enter' })
    })

    it('无问题时提示', () => {
      page.data.questions = []
      page.startQA()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('加载') })
      )
    })
  })

  describe('onAnswer', () => {
    it('单选题替换答案', () => {
      page.data = {
        questions: [{ id: 1, type: 'single' }],
        currentQ: 0,
        answers: {},
      }
      page.setData = jest.fn()
      page.onAnswer({ detail: { optionIndex: 0 } })
      expect(page.setData).toHaveBeenCalledWith({ answers: { 1: [0] } })
    })

    it('多选题切换选项', () => {
      page.data = {
        questions: [{ id: 1, type: 'multi' }],
        currentQ: 0,
        answers: { 1: [0] },
      }
      page.setData = jest.fn()
      page.onAnswer({ detail: { optionIndex: 1 } })
      expect(page.setData).toHaveBeenCalledWith({ answers: { 1: [0, 1] } })
    })

    it('多选题取消已选选项', () => {
      page.data = {
        questions: [{ id: 1, type: 'multi' }],
        currentQ: 0,
        answers: { 1: [0, 1] },
      }
      page.setData = jest.fn()
      // optionIndex 是 0，prev.indexOf(0) = 0, idx=0
      page.onAnswer({ detail: { optionIndex: 0 } })
      expect(page.setData).toHaveBeenCalledWith({ answers: { 1: [1] } })
    })
  })

  describe('submitQA', () => {
    it('成功获取推荐结果', async () => {
      page.data = {
        stage: 'qa',
        answers: { 1: [0, 1], 2: [0] },
        questions: [{ id: 1 }, { id: 2 }],
      }
      page.setData = jest.fn()
      await page.submitQA()

      expect(page.setData).toHaveBeenCalledWith({ stage: 'loading' })
      expect(mockGetRecommendations).toHaveBeenCalled()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'result', results: expect.any(Array) })
      )
    })

    it('无结果时显示提示', async () => {
      mockGetRecommendations.mockResolvedValue([])
      page.data = { answers: {}, questions: [] }
      page.setData = jest.fn()
      await page.submitQA()
      expect(wx.showToast).toHaveBeenCalled()
    })

    it('接口异常时回退到 welcome', async () => {
      mockGetRecommendations.mockRejectedValue(new Error('fail'))
      page.data = { answers: {}, questions: [] }
      page.setData = jest.fn()
      await page.submitQA()
      expect(page.setData).toHaveBeenCalledWith({ stage: 'welcome' })
    })
  })

  describe('addToCart', () => {
    it('未登录时提示', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      await page.addToCart({ currentTarget: { dataset: { id: 1 } } })
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('登录') })
      )
    })

    it('登录后加入购物车成功', async () => {
      mockIsLoggedIn.mockReturnValue(true)
      mockAddToCart.mockResolvedValue({})
      mockApp.globalData.cartCount = 0
      await page.addToCart({ currentTarget: { dataset: { id: 5 } } })
      expect(mockAddToCart).toHaveBeenCalledWith({ productType: 'cigar', productId: 5, spec: '单支', qty: 1 })
      expect(mockUpdateCartBadge).toHaveBeenCalledWith(1)
    })
  })

  describe('viewDetail', () => {
    it('导航到详情页', () => {
      page.viewDetail({ currentTarget: { dataset: { id: 10 } } })
      expect(wx.navigateTo).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/pages/cigar-detail/cigar-detail?id=10' })
      )
    })
  })

  describe('restart', () => {
    it('重置所有状态回 welcome', () => {
      page.setData = jest.fn()
      page.restart()
      expect(page.setData).toHaveBeenCalledWith({
        stage: 'welcome', currentQ: 0, answers: {}, results: []
      })
    })
  })
})
