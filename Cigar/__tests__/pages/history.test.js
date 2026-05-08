require('../setup')

const mockGetHistory = jest.fn()
const mockIsLoggedIn = jest.fn()

jest.mock('../../utils/api', () => ({ getHistory: mockGetHistory }))
jest.mock('../../utils/request', () => ({ isLoggedIn: mockIsLoggedIn }))

global.getApp = () => ({ globalData: { selectedTab: -1 }, updateCartBadge: jest.fn() })
const mockTabBar = { setData: jest.fn() }

describe('pages/history/history', () => {
  let page
  beforeAll(() => {
    require('../../pages/history/history')
    page = global.Page.mock.calls.at(-1)[0]
  })
  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockIsLoggedIn.mockReturnValue(true)
    mockGetHistory.mockResolvedValue([
      { date: '2026-05-03', records: [{ id: 1, name: 'A', type: 'tasted', rating: 4 }] },
    ])
    page.data.activeFilter = 0
    page.data.groups = []
    page.data.loading = true
    page.data.allGroups = []
    page.data.page = 1
    page.data.hasMore = true
  })

  it('初始数据正确', () => {
    expect(page.data.activeFilter).toBe(0)
    expect(page.data.filterTabs).toHaveLength(3)
  })

  describe('_loadHistory', () => {
    it('未登录时清空', async () => {
      mockIsLoggedIn.mockReturnValue(false)
      await page._loadHistory()
      expect(page.setData).toHaveBeenCalledWith({ loading: false, groups: [] })
    })

    it('加载历史并按日期分组', async () => {
      await page._loadHistory(true)
      expect(mockGetHistory).toHaveBeenCalledWith({ page: 1, pageSize: 30 })
      expect(page.setData).toHaveBeenCalledWith(expect.objectContaining({ loading: false }))
    })

    it('加载失败时结束loading', async () => {
      mockGetHistory.mockRejectedValue(new Error('fail'))
      await page._loadHistory()
      expect(page.setData).toHaveBeenCalledWith({ loading: false })
    })

    it('翻页时合并分组数据', async () => {
      page.data.loading = false
      page.data.allGroups = [{ date: '2026-05-03', records: [{ id: 1, type: 'tasted', rating: 4 }] }]
      mockGetHistory.mockResolvedValue([
        { date: '2026-05-03', records: [{ id: 2, type: 'purchased', rating: 3 }] },
        { date: '2026-05-01', records: [{ id: 3, type: 'tasted', rating: 5 }] },
      ])
      await page._loadHistory(false)
      expect(page.setData).toHaveBeenCalled()
    })
  })

  describe('_applyFilter', () => {
    it('filterIdx=0 显示全部', () => {
      page.data.allGroups = [{ date: '2026-05-01', records: [{ type: 'tasted' }] }]
      page._applyFilter(0)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ groups: expect.any(Array) })
      )
    })

    it('filterIdx=1 仅显示 purchased', () => {
      page.data.allGroups = [
        { date: '2026-05-01', records: [{ type: 'tasted' }, { type: 'purchased' }] },
      ]
      page._applyFilter(1)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ groups: [{ date: '2026-05-01', records: [{ type: 'purchased' }] }] })
      )
    })
  })

  it('viewDetail 跳转详情页', () => {
    page.viewDetail({ currentTarget: { dataset: { cigarId: 5 } } })
    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/cigar-detail/cigar-detail?id=5' })
  })

  it('shareRecord 跳转海报页', () => {
    page.shareRecord({ currentTarget: { dataset: { cigarId: 3 } } })
    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/poster/poster?cigarId=3' })
  })

  it('switchFilter 切换标签', () => {
    page.switchFilter({ currentTarget: { dataset: { index: 1 } } })
    expect(page.setData).toHaveBeenCalledWith({ activeFilter: 1 })
  })
})
