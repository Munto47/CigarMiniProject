const { getCart, getMemberProfile, createOrder, payOrder, submitReview } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

/** 生成简单 UUID（小程序环境） */
function generateUUID() {
  const s = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  return `${s()}${s()}-${s()}-${s()}-${s()}-${s()}${s()}${s()}`
}

Page({
  data: {
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    memberBalance: 0,
    payMethod: 'balance',
    paying: false,

    memberLevel: {
      rechargeLevel: 0,
      consumeLevel: 0,
    },

    showRateModal: false,
    rateScore: 0,
    rateText: '',
    lastOrderId: null,
    lastCigarId: null,
  },

  async onLoad() {
    if (!isLoggedIn()) {
      const loggedIn = await getApp().promptLogin({ message: '结算前请先登录' })
      if (!loggedIn) {
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
    }

    // 生成或恢复幂等 key（与购物车绑定，防止重复下单）
    const storedKey = wx.getStorageSync('checkout_idempotency_key')
    this._idempotencyKey = storedKey || generateUUID()
    if (!storedKey) {
      wx.setStorageSync('checkout_idempotency_key', this._idempotencyKey)
    }

    try {
      const [cart, profile] = await Promise.all([
        getCart(),
        getMemberProfile(),
      ])

      const items = (cart && cart.items) ? cart.items : []
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)

      // 折扣计算（基于会员等级，简化逻辑）
      let discount = 0
      if (profile && profile.recharge && profile.recharge.level >= 6) {
        discount = -Math.round(subtotal * 0.1 * 100) / 100 // 9 折
      }

      this.setData({
        items,
        subtotal,
        discount,
        total: Math.max(0, subtotal + discount),
        memberBalance: profile ? profile.balance : 0,
        memberLevel: profile ? {
          rechargeLevel: profile.rechargeLevel || 0,
          consumeLevel: profile.consumptionLevel || 0,
        } : { rechargeLevel: 0, consumeLevel: 0 },
      })

      if (items.length === 0) {
        wx.showToast({ title: '购物车为空', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1000)
      }
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  selectPayMethod(e) {
    this.setData({ payMethod: e.currentTarget.dataset.method })
  },

  async pay() {
    if (this.data.paying) return
    this.setData({ paying: true })

    const { payMethod, total, memberBalance, items } = this.data

    try {
      // 1. 创建订单（使用持久化幂等 key，防止重复下单）
      const orderResult = await createOrder(this._idempotencyKey, items)

      const orderId = orderResult.orderId || orderResult.id
      if (!orderId) {
        throw new Error('订单创建失败')
      }

      // 如果是幂等命中，直接进入支付
      if (orderResult.idempotent && orderResult.status === 'paid') {
        wx.showToast({ title: '订单已支付', icon: 'success' })
        this.setData({ paying: false })
        return
      }

      // 2. 支付
      if (payMethod === 'balance') {
        if (total > memberBalance) {
          this.setData({ paying: false })
          wx.showModal({
            title: '余额不足',
            content: `当前余额 ¥${memberBalance.toFixed(2)}，还差 ¥${(total - memberBalance).toFixed(2)}，是否前往充值？`,
            confirmText: '去充值',
            cancelText: '取消',
            success: ({ confirm }) => {
              if (confirm) wx.switchTab({ url: '/pages/club/club' })
            },
          })
          return
        }

        wx.showLoading({ title: '支付中...', mask: true })

        const payResult = await payOrder(orderId, 'balance')
        wx.hideLoading()
        this.setData({ paying: false })

        if (payResult.paid) {
          wx.showToast({ title: '支付成功', icon: 'success' })
          wx.removeStorageSync('checkout_idempotency_key')
          // 清空购物车角标
          getApp().updateCartBadge(0)
          // 记录订单信息用于评价
          const firstItem = items[0]
          this.setData({
            lastOrderId: orderId,
            lastCigarId: firstItem ? firstItem.productId : null,
          })
          // 延迟弹出评价 Modal
          setTimeout(() => {
            this.setData({ showRateModal: true, rateScore: 0, rateText: '' })
          }, 1200)
        }
      } else {
        // 美团支付
        const payResult = await payOrder(orderId, 'meituan')
        this.setData({ paying: false })

        if (payResult.redirectUrl) {
          wx.showToast({ title: '正在跳转美团收银...', icon: 'none' })
          // 实际环境需要跳转到美团
        } else {
          wx.showToast({ title: '美团支付暂不可用', icon: 'none' })
        }
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ paying: false })
      // 余额不足等错误已在 request 层提示
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

  async submitRate() {
    const { rateScore, rateText, lastCigarId, lastOrderId } = this.data

    if (rateScore === 0) {
      wx.showToast({ title: '请先为本次品鉴打分', icon: 'none' })
      return
    }

    try {
      await submitReview({
        cigarId: Number(lastCigarId),
        orderId: lastOrderId ? Number(lastOrderId) : undefined,
        rating: rateScore,
        content: rateText.trim() || '体验不错',
      })
      wx.showToast({ title: '感谢您的评价！', icon: 'success', duration: 1800 })
    } catch (err) {
      // 敏感词等错误由 request 层处理
      if (err.message && err.message.includes('敏感词')) {
        wx.showToast({ title: '内容含有敏感词，请修改后重试', icon: 'none', duration: 2500 })
        return
      }
    }

    setTimeout(() => {
      this.setData({ showRateModal: false })
      wx.navigateBack()
    }, 1900)
  }
})
