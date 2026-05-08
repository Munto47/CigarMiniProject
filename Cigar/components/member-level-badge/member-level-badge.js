Component({
  properties: {
    type:  { type: String, value: 'recharge' },
    level: { type: Number, value: 1 },
    size:  { type: String, value: 'md' }
  },

  data: {
    levelText: '',
    levelImage: '',
    cigarImage: ''
  },

  observers: {
    'type, level'(type, level) {
      this._updateBadge(type, level)
    }
  },

  lifetimes: {
    attached() {
      this._updateBadge(this.data.type, this.data.level)
    }
  },

  methods: {
    _updateBadge(type, level) {
      const v = Math.min(9, Math.max(1, level || 1))
      this.setData({
        levelText: type === 'consume' ? String(v) : '',
        levelImage: `/src/level/level_${v}.png`,
        cigarImage: `/src/cigar/cigar_${v}.png`
      })
    }
  }
})
