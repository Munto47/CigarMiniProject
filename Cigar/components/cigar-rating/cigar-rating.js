/**
 * cigar-rating — 雪茄形状评分组件
 *
 * Properties:
 *   value    {Number}  0–5，支持 0.5 步长（只读时展示半颗）
 *   readonly {Boolean} true=只读展示；false=交互打分（仅整数 1–5）
 *   size     {String}  'sm' | 'md'(默认) | 'lg'
 *
 * Events:
 *   change   { value: Number }  仅交互模式下触发
 */
Component({
  properties: {
    value:    { type: Number,  value: 0 },
    readonly: { type: Boolean, value: true },
    size:     { type: String,  value: 'md' }
  },

  data: {
    segments: []
  },

  observers: {
    value(val) {
      this._rebuild(val)
    }
  },

  lifetimes: {
    attached() {
      this._rebuild(this.data.value)
    }
  },

  methods: {
    /* 根据分值重建 5 个 segment 对象 */
    _rebuild(val) {
      const segs = []
      for (let i = 0; i < 5; i++) {
        let type
        if (val >= i + 1)        type = 'full'
        else if (val >= i + 0.5) type = 'half'
        else                     type = 'empty'
        segs.push({ type, idx: i })
      }
      this.setData({ segments: segs })
    },

    onTap(e) {
      if (this.data.readonly) return
      const idx    = e.currentTarget.dataset.idx
      const newVal = idx + 1
      this._rebuild(newVal)
      this.setData({ value: newVal })
      this.triggerEvent('change', { value: newVal })
      wx.vibrateShort({ type: 'light' })
    }
  }
})
