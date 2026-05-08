require('../setup')

describe('components/cigar-rating', () => {
  let comp
  beforeAll(() => {
    require('../../components/cigar-rating/cigar-rating')
    comp = global.Component.mock.calls.at(-1)[0]
    Object.assign(comp, comp.methods)
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.setData = jest.fn()
    comp.triggerEvent = jest.fn()
    comp.data.value = 0
    comp.data.readonly = true
  })

  describe('_rebuild', () => {
    it('value=0 全为空', () => {
      comp._rebuild(0)
      const segs = comp.setData.mock.calls[0][0].segments
      expect(segs.every(s => s.type === 'empty')).toBe(true)
    })
    it('value=5 全满', () => {
      comp._rebuild(5)
      const segs = comp.setData.mock.calls[0][0].segments
      expect(segs.every(s => s.type === 'full')).toBe(true)
    })
    it('value=3.5 产生 half', () => {
      comp._rebuild(3.5)
      const segs = comp.setData.mock.calls[0][0].segments
      expect(segs.filter(s => s.type === 'half')).toHaveLength(1)
      expect(segs.filter(s => s.type === 'full')).toHaveLength(3)
    })
  })

  describe('onTap', () => {
    it('readonly 时不响应', () => {
      comp.data.readonly = true
      comp.onTap({ currentTarget: { dataset: { idx: 2 } } })
      expect(comp.setData).not.toHaveBeenCalled()
    })
    it('交互模式点击触发 change 事件', () => {
      comp.data.readonly = false
      comp._rebuild = jest.fn()
      comp.onTap({ currentTarget: { dataset: { idx: 3 } } })
      expect(comp._rebuild).toHaveBeenCalledWith(4)
      expect(comp.setData).toHaveBeenCalledWith({ value: 4 })
      expect(comp.triggerEvent).toHaveBeenCalledWith('change', { value: 4 })
    })
  })

  describe('observers', () => {
    it('value 变化时重建', () => {
      const spy = jest.spyOn(comp, '_rebuild')
      comp.observers.value.call(comp, 3)
      expect(spy).toHaveBeenCalledWith(3)
      spy.mockRestore()
    })
  })
})
