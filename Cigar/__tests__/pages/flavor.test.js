require('../setup')

const mockGetFlavorTags = jest.fn()
const mockMatchCigarByFlavors = jest.fn()
const mockCreatePoster = jest.fn()

jest.mock('../../utils/api', () => ({
  getFlavorTags: mockGetFlavorTags,
  matchCigarByFlavors: mockMatchCigarByFlavors,
  createPoster: mockCreatePoster,
}))

const mockGlobalData = { selectedTab: -1 }
global.getApp = () => ({ globalData: mockGlobalData })
const mockTabBar = { setData: jest.fn() }

describe('pages/flavor/flavor', () => {
  let page
  beforeAll(() => {
    require('../../pages/flavor/flavor')
    page = global.Page.mock.calls.at(-1)[0]
  })
  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    delete mockGlobalData.posterFlavorSaved
    delete mockGlobalData.posterFlavors
    mockGetFlavorTags.mockResolvedValue([
      { name: '果香甜润', scoreMap: { 果香: 80, 甜感: 60 } },
      { name: '木质烟草', scoreMap: null },
    ])
    mockMatchCigarByFlavors.mockResolvedValue({
      id: 1, name: 'Cohiba Robusto', tags: ['木质烟草', '雪松丝绸', '咖啡可可'],
    })
    mockCreatePoster.mockResolvedValue({ id: 1 })
    page.data = { tags: [], scores: { 果香: 0, 木香: 0, 烟草: 0, 辛辣: 0, 土壤: 0, 甜感: 0 }, hasResult: false }
  })

  it('初始scores全为0', () => {
    expect(page.data.scores.果香).toBe(0)
    expect(page.data.hasResult).toBe(false)
  })

  describe('_loadTags', () => {
    it('成功加载标签', async () => {
      await page._loadTags()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.any(Array) })
      )
    })

    it('API失败时使用默认标签', async () => {
      mockGetFlavorTags.mockRejectedValue(new Error('fail'))
      await page._loadTags()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.any(Array) })
      )
    })

    it('空标签时使用默认标签回退', async () => {
      mockGetFlavorTags.mockResolvedValue([])
      await page._loadTags()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.any(Array) })
      )
    })
  })

  describe('onToggleTag', () => {
    it('选择标签后计算分数', () => {
      page.data.tags = [
        { label: '果香甜润', selected: false, scoreMap: { 果香: 80, 甜感: 60 } },
      ]
      page.onToggleTag({ detail: { label: '果香甜润' } })
      expect(page.setData).toHaveBeenCalledWith(expect.objectContaining({ hasResult: true }))
    })

    it('取消选择后 hasResult = false', () => {
      page.data.tags = [
        { label: '果香甜润', selected: true },
      ]
      page.onToggleTag({ detail: { label: '果香甜润' } })
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ hasResult: false })
      )
    })
  })

  it('resetAll 重置所有状态', () => {
    page.data.tags = [{ label: '木质烟草', selected: true }]
    page.resetAll()
    expect(page.setData).toHaveBeenCalledWith(
      expect.objectContaining({ hasResult: false })
    )
  })

  describe('generatePoster', () => {
    it('无选中标签时提示用户', () => {
      page.data.tags = [{ label: '果香甜润', selected: false }]
      page.generatePoster()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '请先选择风味标签' })
      )
      expect(wx.navigateTo).not.toHaveBeenCalled()
    })

    it('匹配成功后跳转海报页并自动写入记录', async () => {
      page.data.tags = [
        { label: '雪松丝绸', selected: true },
        { label: '咖啡可可', selected: true },
      ]
      page.data.scores = { 果香: 35, 木香: 100, 烟草: 55, 辛辣: 0, 土壤: 0, 甜感: 90 }

      await page.generatePoster()

      // 应调用匹配接口
      expect(mockMatchCigarByFlavors).toHaveBeenCalledWith(['雪松丝绸', '咖啡可可'])

      // 应自动创建海报记录
      expect(mockCreatePoster).toHaveBeenCalledWith({
        cigarId: 1,
        cigarName: 'Cohiba Robusto',
        flavorTags: ['雪松丝绸', '咖啡可可'],
        flavorScores: { 果香: 35, 木香: 100, 烟草: 55, 辛辣: 0, 土壤: 0, 甜感: 90 },
      })

      // 应设置防重复标志
      expect(getApp().globalData.posterFlavorSaved).toBe(true)

      // 应传递数据到 poster 页
      expect(getApp().globalData.posterFlavors).toEqual({
        tags: ['雪松丝绸', '咖啡可可'],
        scores: { 果香: 35, 木香: 100, 烟草: 55, 辛辣: 0, 土壤: 0, 甜感: 90 },
        matchedCigar: { id: 1, name: 'Cohiba Robusto', tags: ['木质烟草', '雪松丝绸', '咖啡可可'] },
      })

      // 应跳转到海报页
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/poster/poster' })
    })

    it('匹配失败时 createPoster 异常不影响跳转', async () => {
      mockCreatePoster.mockRejectedValue(new Error('fail'))
      page.data.tags = [{ label: '雪松丝绸', selected: true }]

      await page.generatePoster()

      // createPoster 失败不应阻断跳转
      expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/poster/poster' })
    })
  })
})
