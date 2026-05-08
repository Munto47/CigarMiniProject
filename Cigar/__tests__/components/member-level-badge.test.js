require('../setup')

describe('components/member-level-badge', () => {
  let comp
  beforeAll(() => {
    require('../../components/member-level-badge/member-level-badge')
    comp = global.Component.mock.calls.at(-1)[0]
    // 将 methods 挂到 comp 上让 this.methodName() 能正常工作
    Object.assign(comp, comp.methods)
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.setData = jest.fn()
    comp.data.type = 'recharge'
    comp.data.level = 1
  })

  describe('_updateBadge', () => {
    it('level 在 1-9 范围内', () => {
      comp._updateBadge('recharge', 3)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ levelImage: '/src/level/level_3.png' })
      )
    })
    it('level 超过 9 时 clamp 到 9', () => {
      comp._updateBadge('recharge', 99)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ levelImage: '/src/level/level_9.png' })
      )
    })
    it('level 小于 1 时 clamp 到 1', () => {
      comp._updateBadge('recharge', 0)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ levelImage: '/src/level/level_1.png' })
      )
    })
    it('type=consume 时 levelText 为字符串数字', () => {
      comp._updateBadge('consume', 5)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ levelText: '5' })
      )
    })
  })

  describe('observers', () => {
    it('type/level 变化时触发 _updateBadge', () => {
      const spy = jest.spyOn(comp, '_updateBadge')
      comp.observers['type, level'].call(comp, 'consume', 7)
      expect(spy).toHaveBeenCalledWith('consume', 7)
      spy.mockRestore()
    })
  })

  describe('lifetimes.attached', () => {
    it('初始化时调用 _updateBadge', () => {
      const spy = jest.spyOn(comp, '_updateBadge')
      comp.lifetimes.attached.call(comp)
      expect(spy).toHaveBeenCalledWith('recharge', 1)
      spy.mockRestore()
    })
  })
})
