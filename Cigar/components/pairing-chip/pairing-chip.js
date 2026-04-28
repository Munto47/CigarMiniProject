Component({
  properties: {
    label:    { type: String,  value: '' },
    selected: { type: Boolean, value: false }
  },

  methods: {
    tap() {
      wx.vibrateShort({ type: 'light' })
      this.triggerEvent('toggle', { label: this.data.label })
    }
  }
})
