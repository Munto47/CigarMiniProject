require('../setup')

describe('components/navigation-bar', () => {
  let comp
  beforeAll(() => {
    require('../../components/navigation-bar/navigation-bar')
    comp = global.Component.mock.calls.at(-1)[0]
    Object.assign(comp, comp.methods)
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.setData = jest.fn()
    comp.triggerEvent = jest.fn()
    comp.data.animated = true
    comp.data.delta = 1
  })

  describe('_showChange', () => {
    it('show=true + animated=true → opacity:1', () => {
      comp._showChange(true)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ displayStyle: expect.stringContaining('opacity: 1') })
      )
    })

    it('show=false + animated=false → display:none', () => {
      comp.data.animated = false
      comp._showChange(false)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ displayStyle: expect.stringContaining('display: none') })
      )
    })
  })

  describe('back', () => {
    it('navigateBack + 触发 back 事件', () => {
      comp.back()
      expect(wx.navigateBack).toHaveBeenCalledWith({ delta: 1 })
      expect(comp.triggerEvent).toHaveBeenCalledWith('back', { delta: 1 }, {})
    })
  })

  describe('lifetimes.attached', () => {
    it('初始化 padding 和 safe area', () => {
      comp.lifetimes.attached.call(comp)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          ios: expect.any(Boolean),
          innerPaddingRight: expect.any(String),
        })
      )
    })
  })
})
