Component({
  properties: {
    type:  { type: String, value: 'recharge' },
    level: { type: Number, value: 1 },
    size:  { type: String, value: 'md' }
  },

  data: {
    levelText: 'V1'
  },

  observers: {
    level(val) {
      const v = Math.min(9, Math.max(1, val || 1))
      this.setData({ levelText: 'V' + v })
    }
  },

  lifetimes: {
    attached() {
      const v = Math.min(9, Math.max(1, this.data.level || 1))
      this.setData({ levelText: 'V' + v })
    }
  }
})
