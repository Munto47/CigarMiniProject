Component({
  properties: {
    question: { type: Object, value: {} },
    answers:  { type: Array,  value: [] }
  },

  data: {
    flashIdx: -1,
    answersMap: {}
  },

  observers: {
    'answers': function(answers) {
      const map = {}
      ;(answers || []).forEach(idx => { map[idx] = true })
      this.setData({ answersMap: map })
    }
  },

  methods: {
    selectOption(e) {
      const { index } = e.currentTarget.dataset
      this.setData({ flashIdx: index })
      setTimeout(() => this.setData({ flashIdx: -1 }), 360)
      wx.vibrateShort({ type: 'light' })
      this.triggerEvent('answer', { optionIndex: index })
    },

    next() {
      if ((this.data.answers || []).length === 0) {
        wx.showToast({ title: '请选择一个选项', icon: 'none' })
        return
      }
      this.triggerEvent('next')
    }
  }
})
