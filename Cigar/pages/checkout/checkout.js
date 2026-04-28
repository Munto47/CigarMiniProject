const MOCK_ORDER = {
  items: [
    { id: 1, name: 'Cohiba Behike 52',          spec: '单支', price: 1280, qty: 1 },
    { id: 2, name: 'Davidoff Winston Churchill', spec: '单支', price: 680,  qty: 2 }
  ],
  discount:      -200,
  memberBalance: 3680
}

Page({
  data: {
    order:     MOCK_ORDER,
    subtotal:  0,
    total:     0,
    payMethod: 'balance',  // 'balance' | 'meituan'
    paying:    false,

    /* ── 评价弹窗 ── */
    showRateModal: false,
    rateScore:     0,
    rateText:      ''
  },

  onLoad() {
    const subtotal = MOCK_ORDER.items.reduce((s, i) => s + i.price * i.qty, 0)
    this.setData({ subtotal, total: subtotal + MOCK_ORDER.discount })
  },

  selectPayMethod(e) {
    this.setData({ payMethod: e.currentTarget.dataset.method })
  },

  pay() {
    if (this.data.paying) return
    this.setData({ paying: true })

    if (this.data.payMethod === 'balance') {
      if (this.data.total > this.data.order.memberBalance) {
        wx.showToast({ title: '余额不足，请充值', icon: 'none' })
        this.setData({ paying: false })
        return
      }
      wx.showLoading({ title: '支付中...', mask: true })
      setTimeout(() => {
        wx.hideLoading()
        this.setData({ paying: false })
        wx.showToast({ title: '支付成功', icon: 'success' })
        /* 支付成功后延迟弹出评价 Modal */
        setTimeout(() => {
          this.setData({ showRateModal: true, rateScore: 0, rateText: '' })
        }, 1200)
      }, 1200)
    } else {
      wx.showToast({ title: '正在跳转美团收银...', icon: 'none' })
      this.setData({ paying: false })
    }
  },

  /* ════════ 评价弹窗 ════════ */

  closeRateModal() {
    this.setData({ showRateModal: false })
    wx.navigateBack()
  },

  onRateScoreChange(e) {
    this.setData({ rateScore: e.detail.value })
  },

  onRateTextInput(e) {
    this.setData({ rateText: e.detail.value })
  },

  submitRate() {
    const { rateScore, rateText } = this.data
    if (rateScore === 0) {
      wx.showToast({ title: '请先为本次品鉴打分', icon: 'none' })
      return
    }
    /* Mock：打印评价数据，实际对接后端时替换 */
    console.log('[Mock] 提交评价:', { rateScore, rateText, orderId: Date.now() })

    wx.showToast({ title: '感谢您的评价！', icon: 'success', duration: 1800 })
    setTimeout(() => {
      this.setData({ showRateModal: false })
      wx.navigateBack()
    }, 1900)
  }
})
