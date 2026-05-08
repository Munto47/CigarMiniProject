require('../setup')

describe('components/flavor-radar', () => {
  let comp
  beforeAll(() => {
    require('../../components/flavor-radar/flavor-radar')
    comp = global.Component.mock.calls.at(-1)[0]
    Object.assign(comp, comp.methods)
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.setData = jest.fn()
    comp.createSelectorQuery = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      fields: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    }))
    comp.data.scores = { 果香: 60, 木香: 75, 烟草: 80, 辛辣: 50, 土壤: 65, 甜感: 55 }
    comp.data.barList = []
  })

  it('6 轴标签', () => {
    expect(comp.data.axes).toHaveLength(6)
  })

  describe('_buildBars', () => {
    it('根据 scores 构建柱状数据', () => {
      comp._buildBars()
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ barList: expect.any(Array) })
      )
      const bars = comp.setData.mock.calls[0][0].barList
      expect(bars).toHaveLength(6)
      expect(bars[0].label).toBe('果香')
      expect(bars[0].value).toBe(60)
    })

    it('缺失的 score 默认为 0', () => {
      comp.data.scores = { 果香: 80 }
      comp._buildBars()
      const bars = comp.setData.mock.calls[0][0].barList
      expect(bars[1].value).toBe(0)
    })
  })

  describe('observers', () => {
    it('scores 变化时重建数据', () => {
      const spy = jest.spyOn(comp, '_buildBars')
      comp.observers.scores.call(comp, { 果香: 90 })
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
