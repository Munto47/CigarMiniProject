require('../setup')

const mockGetCigarDetail = jest.fn()
const mockCreatePoster = jest.fn()
const mockAnalyzeVoice = jest.fn()
const mockMatchCigarByFlavors = jest.fn()
const mockIsLoggedIn = jest.fn()

jest.mock('../../utils/api', () => ({
  getCigarDetail: mockGetCigarDetail,
  createPoster: mockCreatePoster,
  analyzeVoice: mockAnalyzeVoice,
  matchCigarByFlavors: mockMatchCigarByFlavors,
}))
jest.mock('../../utils/request', () => ({ isLoggedIn: mockIsLoggedIn }))

const mockGlobalData = {}
global.getApp = () => ({ globalData: mockGlobalData })

describe('pages/poster/poster', () => {
  let page
  beforeAll(() => {
    require('../../pages/poster/poster')
    page = global.Page.mock.calls.at(-1)[0]
  })
  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    page.createSelectorQuery = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      fields: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    }))
    mockIsLoggedIn.mockReturnValue(false)
    mockGetCigarDetail.mockResolvedValue({
      id: 5, name: '高希霸', tags: ['木质', '烟草', '咖啡'],
    })
    mockMatchCigarByFlavors.mockResolvedValue({
      id: 1, name: 'Cohiba Robusto', tags: ['木质烟草'],
    })
    page.data = {
      stage: 'record', flavors: ['木质烟草', '咖啡可可', '奶油丝滑'],
      canvasWidth: 343, canvasHeight: 343, savingPoster: false,
      cigarId: null, cigarName: '', transcript: '',
      posterSaved: false, tastingAdded: false,
    }
    // 清理全局状态
    for (const key of Object.keys(mockGlobalData)) {
      delete mockGlobalData[key]
    }
  })

  it('初始 stage 为 record', () => {
    expect(page.data.stage).toBe('record')
    expect(page.data.flavors).toHaveLength(3)
  })

  describe('onLoad', () => {
    it('计算画布尺寸', () => {
      page.onLoad({})
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ canvasWidth: expect.any(Number) })
      )
    })

    it('有 cigarId 时加载风味', () => {
      const spy = jest.spyOn(page, '_loadCigarFlavor').mockImplementation(() => {})
      page.onLoad({ cigarId: '10' })
      expect(spy).toHaveBeenCalledWith('10')
      spy.mockRestore()
    })
  })

  describe('_loadCigarFlavor', () => {
    it('成功加载雪茄风味', async () => {
      await page._loadCigarFlavor(5)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          flavors: ['木质', '烟草', '咖啡'],
          cigarName: '高希霸',
          stage: 'preview',
        })
      )
    })

    it('加载失败时 fallback 到 matchCigarByFlavors', async () => {
      mockGetCigarDetail.mockRejectedValue(new Error('fail'))
      await page._loadCigarFlavor(1)
      // 应调用 matchCigarByFlavors 作为后备
      expect(mockMatchCigarByFlavors).toHaveBeenCalled()
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'preview' })
      )
    })
  })

  describe('onRecordStop', () => {
    it('录音结束后进入输入阶段', () => {
      page.onRecordStop({ detail: { filePath: '/tmp/voice.mp3' } })
      expect(page.setData).toHaveBeenCalledWith({ stage: 'input' })
    })
  })

  it('reRecord 重置为录音状态', () => {
    page.reRecord()
    expect(page.setData).toHaveBeenCalledWith({
      stage: 'record',
      transcript: '',
      inputText: '',
      posterSaved: false,
      tastingAdded: false,
      cigarId: null,
      cigarName: '',
    })
  })

  it('savePoster saving 中时防重复', () => {
    page.data.savingPoster = true
    page.savePoster()
    expect(page.setData).not.toHaveBeenCalledWith(expect.objectContaining({ savingPoster: true }))
  })

  describe('_autoSavePoster', () => {
    it('已保存时跳过', async () => {
      page.data.posterSaved = true
      await page._autoSavePoster()
      expect(mockCreatePoster).not.toHaveBeenCalled()
    })

    it('posterFlavorSaved 标志为 true 时跳过并清除标志', async () => {
      mockGlobalData.posterFlavorSaved = true
      await page._autoSavePoster()
      expect(mockGlobalData.posterFlavorSaved).toBeNull()
      expect(mockCreatePoster).not.toHaveBeenCalled()
      expect(page.setData).toHaveBeenCalledWith({ posterSaved: true })
    })

    it('正常保存流程', async () => {
      page.data.cigarId = 5
      page.data.cigarName = 'Cohiba'
      page.data.flavors = ['木质']
      mockCreatePoster.mockResolvedValue({ id: 1 })
      await page._autoSavePoster()
      expect(mockCreatePoster).toHaveBeenCalledWith({
        cigarId: 5,
        cigarName: 'Cohiba',
        flavorTags: ['木质'],
        flavorScores: {},
        voiceText: '',
      })
      expect(page.setData).toHaveBeenCalledWith({ posterSaved: true })
    })
  })
})
