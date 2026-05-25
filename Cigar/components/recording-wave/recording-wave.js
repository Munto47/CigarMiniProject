Component({
  properties: {
    maxDuration: { type: Number, value: 60 }
  },

  data: {
    recording: false,
    countdown: 60,
    bars: [20, 20, 20, 20, 20],
    transcript: ''
  },

  lifetimes: {
    detached() {
      this._stopAll()
    }
  },

  methods: {
    startRecording() {
      if (this.data.recording) return
      this._rm = wx.getRecorderManager()
      this._rm.start({ duration: this.data.maxDuration * 1000, sampleRate: 16000, numberOfChannels: 1, format: 'mp3' })
      this._rm.onStart(() => {
        this.setData({ recording: true, countdown: this.data.maxDuration })
        this._startWave()
        this._startCountdown()
        this.triggerEvent('start')
      })
      this._rm.onStop((res) => {
        this._stopAll()
        this.triggerEvent('stop', { filePath: res.tempFilePath })
        wx.vibrateShort({ type: 'medium' })
      })
    },

    stopRecording() {
      if (!this.data.recording) return
      this._rm && this._rm.stop()
    },

    _startWave() {
      this._waveTimer = setInterval(() => {
        const bars = [
          20 + Math.random() * 60,
          20 + Math.random() * 60,
          20 + Math.random() * 60,
          20 + Math.random() * 60,
          20 + Math.random() * 60
        ]
        this.setData({ bars: bars.map(v => Math.round(v)) })
      }, 150)
    },

    _startCountdown() {
      this._countTimer = setInterval(() => {
        const next = this.data.countdown - 1
        if (next <= 0) {
          this.stopRecording()
        } else {
          this.setData({ countdown: next })
        }
      }, 1000)
    },

    _stopAll() {
      clearInterval(this._waveTimer)
      clearInterval(this._countTimer)
      this.setData({ recording: false, bars: [20, 20, 20, 20, 20] })
    },

    onPressStart() {
      this.startRecording()
    },

    onPressEnd() {
      this.stopRecording()
    }
  }
})
