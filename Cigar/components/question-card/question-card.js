Component({
  properties: {
    question: { type: Object, value: {} },
    answers:  { type: Array,  value: [] }
  },

  data: {
    flashIdx: -1
  },

  lifetimes: {
    attached() {
      /* InnerAudioContext 音效初始化
       * 文件路径 /assets/audio/click.mp3 为本地音效占位；
       * 若文件不存在，onError 静默处理，不影响其他交互。 */
      this._audio = wx.createInnerAudioContext()
      this._audio.src    = '/assets/audio/click.mp3'
      this._audio.volume = 0.65
      this._audio.onError(() => {})
    },
    detached() {
      if (this._audio) {
        this._audio.destroy()
        this._audio = null
      }
    }
  },

  methods: {
    selectOption(e) {
      const { index } = e.currentTarget.dataset

      /* 弹性缩放动效：添加 flash class，340ms 后清除 */
      this.setData({ flashIdx: index })
      setTimeout(() => this.setData({ flashIdx: -1 }), 360)

      /* 本地音效 */
      if (this._audio) {
        this._audio.stop()
        this._audio.play()
      }

      wx.vibrateShort({ type: 'light' })
      this.triggerEvent('answer', { optionIndex: index })
    },

    next() {
      if (this.data.answers.length === 0) {
        wx.showToast({ title: '请选择一个选项', icon: 'none' })
        return
      }
      this.triggerEvent('next')
    }
  }
})
