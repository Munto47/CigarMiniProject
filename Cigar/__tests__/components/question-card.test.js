require('../setup')

describe('components/question-card', () => {
  let comp
  beforeAll(() => {
    require('../../components/question-card/question-card')
    comp = global.Component.mock.calls.at(-1)[0]
    Object.assign(comp, comp.methods)
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.setData = jest.fn()
    comp.triggerEvent = jest.fn()
    comp.data.flashIdx = -1
    comp.data.answers = []
  })

  describe('selectOption', () => {
    it('选择选项触发 answer 事件', () => {
      comp.selectOption({ currentTarget: { dataset: { index: 2 } } })
      expect(comp.setData).toHaveBeenCalledWith({ flashIdx: 2 })
      expect(comp.triggerEvent).toHaveBeenCalledWith('answer', { optionIndex: 2 })
    })

    it('触发振动反馈', () => {
      comp.selectOption({ currentTarget: { dataset: { index: 0 } } })
      expect(wx.vibrateShort).toHaveBeenCalledWith({ type: 'light' })
    })
  })

  describe('next', () => {
    it('未选择时提示', () => {
      comp.data.answers = []
      comp.next()
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('选项') })
      )
    })

    it('已选择时触发 next 事件', () => {
      comp.data.answers = [0]
      comp.next()
      expect(comp.triggerEvent).toHaveBeenCalledWith('next')
    })
  })
})
