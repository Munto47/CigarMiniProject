const AXES = ['果香', '木香', '烟草', '辛辣', '土壤', '甜感']

Component({
  properties: {
    scores: {
      type: Object,
      value: { 果香: 60, 木香: 75, 烟草: 80, 辛辣: 50, 土壤: 65, 甜感: 55 }
    },
    showBars: { type: Boolean, value: true }
  },

  data: {
    axes: AXES,
    barList: []
  },

  lifetimes: {
    ready() {
      this._buildBars()
      setTimeout(() => this._drawRadar(), 100)
    }
  },

  observers: {
    'scores': function(scores) {
      this._buildBars()
      setTimeout(() => this._drawRadar(), 50)
    }
  },

  methods: {
    _buildBars() {
      const { scores } = this.data
      const list = AXES.map(key => ({
        label: key,
        value: scores[key] || 0
      }))
      this.setData({ barList: list })
    },

    _drawRadar() {
      const query = this.createSelectorQuery()
      query.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const { windowWidth } = wx.getWindowInfo()
        const dpr = wx.getWindowInfo().pixelRatio || 2
        const size = Math.min(windowWidth - 80, 280)
        canvas.width  = size * dpr
        canvas.height = size * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        this._render(ctx, size)
      })
    },

    _render(ctx, size) {
      const { scores } = this.data
      const cx = size / 2
      const cy = size / 2
      const r  = size * 0.36
      const n  = AXES.length
      const gold = '#C9A84C'
      const subtleGrid = 'rgba(201,168,76,0.12)'
      const subtleAxis = 'rgba(201,168,76,0.2)'

      ctx.clearRect(0, 0, size, size)

      // 网格环（5 层）
      for (let level = 1; level <= 5; level++) {
        const ratio = level / 5
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = (i * 2 * Math.PI / n) - Math.PI / 2
          const x = cx + r * ratio * Math.cos(angle)
          const y = cy + r * ratio * Math.sin(angle)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.strokeStyle = subtleGrid
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // 轴线
      for (let i = 0; i < n; i++) {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
        ctx.strokeStyle = subtleAxis
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // 数据多边形
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const key = AXES[i]
        const ratio = Math.min((scores[key] || 0) / 100, 1)
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        const x = cx + r * ratio * Math.cos(angle)
        const y = cy + r * ratio * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(201,168,76,0.18)'
      ctx.fill()
      ctx.strokeStyle = gold
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 顶点圆点
      for (let i = 0; i < n; i++) {
        const key = AXES[i]
        const ratio = Math.min((scores[key] || 0) / 100, 1)
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        const x = cx + r * ratio * Math.cos(angle)
        const y = cy + r * ratio * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fillStyle = gold
        ctx.fill()
      }

      // 标签
      ctx.fillStyle = '#9E9484'
      ctx.font = `${size * 0.045}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labelR = r + size * 0.1
      for (let i = 0; i < n; i++) {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        const x = cx + labelR * Math.cos(angle)
        const y = cy + labelR * Math.sin(angle)
        ctx.fillText(AXES[i], x, y)
      }
    }
  }
})
