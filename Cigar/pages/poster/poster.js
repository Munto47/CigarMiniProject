const CLUB_NAME = '皇家雪茄俱乐部'

Page({
  data: {
    stage: 'record',  // 'record' | 'preview'
    transcript: '',
    flavors: ['木质烟草', '咖啡可可', '奶油丝滑'],
    canvasWidth: 343,
    canvasHeight: 343,
    savingPoster: false
  },

  onLoad() {
    const { windowWidth } = wx.getWindowInfo()
    const w = Math.floor(windowWidth - 32)
    this.setData({ canvasWidth: w, canvasHeight: w })
  },

  onShow() {
    // 模拟 AI 分析的风味标签
    this.setData({ flavors: ['木质烟草', '咖啡可可', '奶油丝滑'] })
  },

  onRecordStop(e) {
    const { filePath } = e.detail
    // 模拟语音转文字 + AI 分析
    wx.showLoading({ title: 'AI 分析中...', mask: true })
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        stage: 'preview',
        transcript: '木质底调扑面而来，夹杂着咖啡和奶油的香气，尾段回甘绵长，令人回味。'
      })
      setTimeout(() => this._drawPoster(), 200)
    }, 1800)
  },

  _drawPoster() {
    const query = this.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const dpr = wx.getWindowInfo().pixelRatio || 2
      const { canvasWidth } = this.data
      canvas.width  = canvasWidth * dpr
      canvas.height = canvasWidth * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      this._render(ctx, canvasWidth)
    })
  },

  _render(ctx, size) {
    const { flavors, transcript } = this.data
    const gold = '#C9A84C'
    const goldLight = '#E8C97A'
    const bg = '#161616'
    const textPrimary = '#F5F0E8'
    const textSec = '#9E9484'

    // 背景
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)

    // 金色边框
    ctx.strokeStyle = 'rgba(201,168,76,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(8, 8, size - 16, size - 16)

    // 顶部装饰线
    ctx.beginPath()
    ctx.moveTo(24, 32)
    ctx.lineTo(size - 24, 32)
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // 雪茄图形（居中）
    const cigX = size / 2 - 100
    const cigY = size * 0.28
    const cigW = 200
    const cigH = 28

    const grad = ctx.createLinearGradient(cigX, cigY, cigX + cigW, cigY)
    grad.addColorStop(0, '#5A3010')
    grad.addColorStop(0.4, '#C9A84C')
    grad.addColorStop(0.55, '#E8C97A')
    grad.addColorStop(0.7, '#C9A84C')
    grad.addColorStop(1, '#5A3010')
    ctx.fillStyle = grad
    this._roundRect(ctx, cigX, cigY, cigW, cigH, 14, 4)
    ctx.fill()

    // 雪茄头
    ctx.fillStyle = gold
    this._roundRect(ctx, cigX + cigW - 2, cigY + 6, 10, 16, 0, 5)
    ctx.fill()

    // 风味标签
    ctx.font = `bold ${size * 0.05}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = goldLight
    const topFlavor = flavors[0] || ''
    ctx.fillText(topFlavor, size / 2, size * 0.47)

    // 副标签
    ctx.font = `${size * 0.034}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.fillStyle = textSec
    const subFlavors = flavors.slice(1).join(' · ')
    ctx.fillText(subFlavors, size / 2, size * 0.54)

    // 描述文字（换行处理）
    ctx.font = `${size * 0.028}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.fillStyle = 'rgba(245,240,232,0.6)'
    this._wrapText(ctx, transcript, size / 2, size * 0.63, size - 64, size * 0.04)

    // 分隔线
    ctx.beginPath()
    ctx.moveTo(40, size - 90)
    ctx.lineTo(size - 40, size - 90)
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // 底部品牌区（固定位置）
    // LOGO 占位（左）
    ctx.fillStyle = 'rgba(201,168,76,0.4)'
    ctx.fillRect(24, size - 72, 32, 32)
    ctx.fillStyle = '#0D0D0D'
    ctx.font = `bold ${size * 0.02}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.fillText('LOGO', 40, size - 56)

    // 俱乐部名（中）
    ctx.fillStyle = textSec
    ctx.font = `${size * 0.028}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.fillText(CLUB_NAME, size / 2, size - 56)

    // 小程序码占位（右）
    ctx.strokeStyle = 'rgba(201,168,76,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(size - 60, size - 76, 40, 40)
    ctx.fillStyle = textSec
    ctx.font = `${size * 0.018}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.fillText('小程序码', size - 40, size - 56)
  },

  _roundRect(ctx, x, y, w, h, rL, rR) {
    ctx.beginPath()
    ctx.moveTo(x + rL, y)
    ctx.lineTo(x + w - rR, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + rR)
    ctx.lineTo(x + w, y + h - rR)
    ctx.quadraticCurveTo(x + w, y + h, x + w - rR, y + h)
    ctx.lineTo(x + rL, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - rL)
    ctx.lineTo(x, y + rL)
    ctx.quadraticCurveTo(x, y, x + rL, y)
    ctx.closePath()
  },

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('')
    let line = ''
    let lineY = y
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i]
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        ctx.fillText(line, x, lineY)
        line = chars[i]
        lineY += lineHeight
        if (lineY > y + lineHeight * 2) break
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, lineY)
  },

  reRecord() {
    this.setData({ stage: 'record', transcript: '' })
  },

  savePoster() {
    if (this.data.savingPoster) return
    this.setData({ savingPoster: true })
    const query = this.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true }).exec((res) => {
      if (!res || !res[0]) return
      const canvas = res[0].node
      wx.canvasToTempFilePath({
        canvas,
        success: (r) => {
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => {
              wx.vibrateShort({ type: 'medium' })
              wx.showToast({ title: '已保存到相册', icon: 'success' })
            },
            fail: () => {
              wx.showToast({ title: '保存失败，请授权相册权限', icon: 'none' })
            }
          })
        },
        complete: () => this.setData({ savingPoster: false })
      })
    })
  }
})
