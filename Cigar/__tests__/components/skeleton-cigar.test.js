require('../setup')

describe('components/skeleton-cigar', () => {
  it('空组件可正常构造不崩溃', () => {
    require('../../components/skeleton-cigar/skeleton-cigar')
    const comp = global.Component.mock.calls.at(-1)[0]
    expect(comp).toBeDefined()
    expect(typeof comp).toBe('object')
  })
})
