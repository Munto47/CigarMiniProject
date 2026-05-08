require('../setup')

describe('components/recording-wave', () => {
  let comp
  beforeAll(() => {
    require('../../components/recording-wave/recording-wave')
    comp = global.Component.mock.calls.at(-1)[0]
    Object.assign(comp, comp.methods)
  })
  beforeEach(() => {
    jest.clearAllMocks()
    comp.setData = jest.fn()
    comp.triggerEvent = jest.fn()
    comp.data = {
      recording: false, countdown: 30,
      bars: [20, 20, 20, 20, 20], transcript: '', maxDuration: 30,
    }
    comp._rm = null
    comp._waveTimer = null
    comp._countTimer = null
  })

  it('默认 recording 为 false', () => {
    expect(comp.data.recording).toBe(false)
    expect(comp.data.countdown).toBe(30)
  })

  describe('startRecording', () => {
    it('开始录音设置状态', () => {
      comp.methods.startRecording.call(comp)
      // _rm.onStart 回调需要手动触发
      expect(comp._rm).toBeTruthy()
    })

    it('已录音中不重复开始', () => {
      comp.data.recording = true
      comp.methods.startRecording.call(comp)
      expect(comp.setData).not.toHaveBeenCalled()
    })
  })

  describe('stopRecording', () => {
    it('录音中可停止', () => {
      comp.data.recording = true
      comp._rm = { stop: jest.fn() }
      comp.methods.stopRecording.call(comp)
      expect(comp._rm.stop).toHaveBeenCalled()
    })

    it('未录音时不操作', () => {
      comp.data.recording = false
      comp.methods.stopRecording.call(comp)
      expect(comp.setData).not.toHaveBeenCalled()
    })
  })

  describe('_stopAll', () => {
    it('清除定时器并重置状态', () => {
      comp.methods._stopAll.call(comp)
      expect(comp.setData).toHaveBeenCalledWith(
        expect.objectContaining({ recording: false, bars: [20, 20, 20, 20, 20] })
      )
    })
  })
})
