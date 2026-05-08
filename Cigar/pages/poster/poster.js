const { getCigarDetail, createPoster, addTastingRecord, analyzeFlavorWithDeepSeek, matchCigarByFlavors } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

// Mock 开关：true = 跳过 DeepSeek 分析和录音，直接返回模拟文字和风味
const MOCK_VOICE_ANALYSIS = true
const MOCK_TRANSCRIPTS = [
  '前段雪松清雅，中段出现咖啡与可可的甜润，尾段绵长回甘，平衡感极佳。',
  '烟草底调厚重，皮革气息贯穿始终，辛香胡椒点缀其中，层次分明。',
  '奶油丝滑为主调，木质底韵若隐若现，甜感持久，适合午后慢品。',
]
const MOCK_FLAVOR_SETS = [
  ['雪松丝绸', '咖啡可可', '奶油丝滑'],
  ['木质烟草', '皮革木桶', '辛香胡椒'],
  ['奶油丝滑', '香草甜美', '果香甜润'],
]

const CLUB_NAME = '山羊雪茄俱乐部'

Page({
  data: {
    stage: 'record',  // record | input | preview
    transcript: '',
    inputText: '',
    analyzing: false,
    flavors: ['木质烟草', '咖啡可可', '奶油丝滑'],
    flavorScores: {},
    canvasWidth: 343,
    canvasHeight: 343,
    savingPoster: false,
    cigarId: null,
    cigarName: '',
    posterSaved: false,
    tastingAdded: false,
  },

  onLoad(options) {
    const { windowWidth } = wx.getWindowInfo()
    const w = Math.floor(windowWidth - 32)
    this.setData({ canvasWidth: w, canvasHeight: w })

    // 优先读取风味选择页传递过来的标签（已含匹配雪茄）
    const app = getApp()
    const posterFlavors = app.globalData.posterFlavors
    if (posterFlavors && posterFlavors.tags && posterFlavors.tags.length > 0) {
      app.globalData.posterFlavors = null
      const matched = posterFlavors.matchedCigar
      this.setData({
        stage: 'preview',
        flavors: posterFlavors.tags.slice(0, 3),
        flavorScores: posterFlavors.scores || {},
        transcript: '根据您选择的风味关键词，AI 为您生成了专属风味海报。',
        cigarId: matched ? matched.id : null,
        cigarName: matched ? matched.name : '',
      })
      setTimeout(() => this._drawPoster(), 200)
      setTimeout(() => this._autoSavePoster(), 400)
      return
    }

    if (options.cigarId) {
      this.setData({ cigarId: options.cigarId })
      this._loadCigarFlavor(options.cigarId)
    }
  },

  async _loadCigarFlavor(cigarId) {
    try {
      const cigar = await getCigarDetail(cigarId)
      if (cigar && cigar.name) {
        const flavors = (cigar.tags && cigar.tags.length > 0)
          ? cigar.tags.slice(0, 3)
          : this.data.flavors
        this.setData({ flavors, cigarName: cigar.name, stage: 'preview' })
        setTimeout(() => this._drawPoster(), 200)
        setTimeout(() => this._autoSavePoster(), 400)
      }
    } catch {
      // 后端不可用时用 mock 目录兜底
      const { matchCigarByFlavors: mcbf } = require('../../utils/api')
      const matched = await mcbf(this.data.flavors)
      this.setData({ cigarName: matched.name, cigarId: matched.id, stage: 'preview' })
      setTimeout(() => this._drawPoster(), 200)
      setTimeout(() => this._autoSavePoster(), 400)
    }
  },

  onRecordStop() {
    // 录音结束后进入文字输入阶段，由 DeepSeek 分析描述文字
    this.setData({ stage: 'input' })
  },

  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  async analyzeText() {
    const { inputText } = this.data

    // ── Mock 分析（跳过 DeepSeek，返回预设识别结果）──
    if (MOCK_VOICE_ANALYSIS) {
      this.setData({ analyzing: true })
      wx.showLoading({ title: 'AI 识别中...', mask: true })
      await new Promise(r => setTimeout(r, 1200))
      const idx = Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)
      const transcript = inputText.trim() || MOCK_TRANSCRIPTS[idx]
      const flavors = MOCK_FLAVOR_SETS[idx]
      const matched = await matchCigarByFlavors(flavors)
      wx.hideLoading()
      this.setData({
        analyzing: false,
        stage: 'preview',
        transcript,
        flavors,
        cigarId: matched.id,
        cigarName: matched.name,
      })
      setTimeout(() => this._drawPoster(), 200)
      this._autoSavePoster()
      return
    }

    if (!inputText.trim()) {
      wx.showToast({ title: '请先输入品鉴描述', icon: 'none' })
      return
    }

    this.setData({ analyzing: true })
    wx.showLoading({ title: 'DeepSeek 分析中...', mask: true })

    try {
      const result = await analyzeFlavorWithDeepSeek(inputText)
      const flavors = (result.flavors && result.flavors.length > 0) ? result.flavors : this.data.flavors
      const matched = await matchCigarByFlavors(flavors)
      wx.hideLoading()
      this.setData({
        stage: 'preview',
        transcript: result.transcript || inputText,
        flavors,
        analyzing: false,
        cigarId: matched.id,
        cigarName: matched.name,
      })
      setTimeout(() => this._drawPoster(), 200)
      this._autoSavePoster()
    } catch {
      wx.hideLoading()
      this.setData({ analyzing: false })
      this._mockAnalysis()
    }
  },

  async _autoSavePoster() {
    if (this.data.posterSaved) return
    const app = getApp()
    if (app.globalData.posterFlavorSaved) {
      app.globalData.posterFlavorSaved = null
      this.setData({ posterSaved: true })
      return
    }
    try {
      await createPoster({
        cigarId: this.data.cigarId ? Number(this.data.cigarId) : undefined,
        cigarName: this.data.cigarName || undefined,
        flavorTags: this.data.flavors,
        flavorScores: this.data.flavorScores || {},
        voiceText: this.data.transcript,
      })
      this.setData({ posterSaved: true })
    } catch { /* 静默保存失败 */ }
  },

  _mockAnalysis() {
    wx.showLoading({ title: 'AI 分析中...', mask: true })
    setTimeout(() => {
      wx.hideLoading()
      const flavors = this.data.flavors
      matchCigarByFlavors(flavors).then(matched => {
        this.setData({
          stage: 'preview',
          transcript: '木质底调扑面而来，夹杂着咖啡和奶油的香气，尾段回甘绵长，令人回味。',
          cigarId: matched.id,
          cigarName: matched.name,
        })
        setTimeout(() => this._drawPoster(), 200)
        this._autoSavePoster()
      })
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

      const logoImg = canvas.createImage()
      logoImg.src = '/images/img_with_word.png'
      logoImg.onload = () => this._render(ctx, canvasWidth, logoImg)
      logoImg.onerror = () => this._render(ctx, canvasWidth, null)
    })
  },

  _render(ctx, size, logoImage) {
    const { flavors, transcript, cigarName } = this.data
    const gold = '#C9A84C'
    const goldLight = '#E8C97A'
    const bg = '#161616'
    const textPrimary = '#F5F0E8'
    const textSec = '#9E9484'

    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)

    ctx.strokeStyle = 'rgba(201,168,76,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(8, 8, size - 16, size - 16)

    ctx.beginPath()
    ctx.moveTo(24, 32)
    ctx.lineTo(size - 24, 32)
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // 雪茄名称（居中，金色，在顶部分隔线与雪茄图案之间）
    ctx.font = `bold ${size * 0.054}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = textPrimary
    ctx.fillText(cigarName || '品鉴雪茄', size / 2, size * 0.15)

    // 细金线（名称下方）
    ctx.beginPath()
    ctx.moveTo(size / 2 - 60, size * 0.21)
    ctx.lineTo(size / 2 + 60, size * 0.21)
    ctx.strokeStyle = 'rgba(201,168,76,0.35)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // 雪茄图案（向下移以为名称腾出空间）
    const cigX = size / 2 - 100
    const cigY = size * 0.32
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

    ctx.fillStyle = gold
    this._roundRect(ctx, cigX + cigW - 2, cigY + 6, 10, 16, 0, 5)
    ctx.fill()

    ctx.font = `bold ${size * 0.05}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = goldLight
    const topFlavor = flavors[0] || ''
    ctx.fillText(topFlavor, size / 2, size * 0.51)

    ctx.font = `${size * 0.034}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.fillStyle = textSec
    const subFlavors = flavors.slice(1).join(' · ')
    ctx.fillText(subFlavors, size / 2, size * 0.58)

    ctx.font = `${size * 0.028}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.fillStyle = 'rgba(245,240,232,0.6)'
    this._wrapText(ctx, transcript, size / 2, size * 0.67, size - 64, size * 0.04)

    ctx.beginPath()
    ctx.moveTo(40, size - 90)
    ctx.lineTo(size - 40, size - 90)
    ctx.strokeStyle = 'rgba(201,168,76,0.2)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    if (logoImage) {
      const logoW = size * 0.3
      const logoH = logoW * (logoImage.height / logoImage.width)
      const logoX = 24
      const logoY = size - logoH - 24
      ctx.drawImage(logoImage, logoX, logoY, logoW, logoH)
    }

    ctx.fillStyle = textSec
    ctx.font = `${size * 0.028}px 'KaiTi', 'STKaiti', '楷体', serif`
    ctx.textAlign = 'center'
    ctx.fillText(CLUB_NAME, size / 2, size - 56)

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
    this.setData({
      stage: 'record',
      transcript: '',
      inputText: '',
      posterSaved: false,
      tastingAdded: false,
      cigarId: null,
      cigarName: '',
    })
  },

  async addToTasting() {
    if (this.data.tastingAdded) return
    const { cigarId, cigarName, flavors, transcript } = this.data
    this.setData({ tastingAdded: true })
    try {
      await addTastingRecord({
        cigarId,
        cigarName,
        flavorTags: flavors,
        voiceText: transcript,
        origin: '风味海报匹配',
      })
      wx.showToast({ title: '已加入品鉴记录', icon: 'success' })
    } catch {
      this.setData({ tastingAdded: false })
      wx.showToast({ title: '记录失败，请重试', icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: 'GOAT CIGAR CLUB - 我的专属雪茄风味海报',
      path: '/pages/poster/poster',
      imageUrl: '/images/pure_img.png'
    }
  },

  async savePoster() {
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
