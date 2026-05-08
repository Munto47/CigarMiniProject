require('../setup')

describe('components/pairing-chip', () => {
  let comp
  beforeAll(() => {
    require('../../components/pairing-chip/pairing-chip')
    comp = global.Component.mock.calls.at(-1)[0]
    Object.assign(comp, comp.methods)
    // 该组件无 data 字段，需要手动创建
    if (!comp.data) comp.data = {}
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.triggerEvent = jest.fn()
    comp.data = { label: '威士忌', selected: false }
  })

  describe('tap', () => {
    it('触发 toggle 事件并传递 label', () => {
      comp.tap()
      expect(wx.vibrateShort).toHaveBeenCalledWith({ type: 'light' })
      expect(comp.triggerEvent).toHaveBeenCalledWith('toggle', { label: '威士忌' })
    })
  })
})
