const { getMemberProfile, getRechargeTiers, getStoreInfo, recharge, mockPayRecharge } = require('../../utils/api')
const { isLoggedIn, clearTokens } = require('../../utils/request')

const GRID_ITEMS = [
  { icon: '\u{1F4CB}', label: '我的订单', path: '', handler: 'orders' },
  { icon: '\u{1F4DC}', label: '品鉴记录', path: '', handler: 'history' },
  { icon: '♥', label: '我的收藏', path: '', handler: 'favorites' },
  { icon: '\u{1F3AB}', label: '优惠券', path: '', handler: 'coupons' },
  { icon: '\u{1F4C5}', label: '品鉴预约', path: '', handler: 'reservation' },
  { icon: '☎', label: '联系客服', path: '', handler: 'contact' },
]

const DEFAULT_BANNERS = [
  { id: 1, title: '欢迎来到 GOAT CIGAR CLUB', desc: '探索专属雪茄品鉴体验', bg: '#1A1008' },
  { id: 2, title: '会员尊享', desc: '充值消费双等级体系', bg: '#0A0F0A' },
  { id: 3, title: 'AI 智能推荐', desc: '找到最适合您的雪茄', bg: '#100A14' },
]

Page({
  data: {
    member: {
      name: '雪茄绅士',
      nameInitial: '雪',
      balance: 0,
      discount: '无折扣',
      recharge: { level: 1, points: 0, nextLevel: 2, remain: 1000, progress: 0 },
      consume: { level: 1, points: 0, nextLevel: 2, remain: 1000, progress: 0 },
    },
    gridItems: GRID_ITEMS,
    banners: DEFAULT_BANNERS,
    bannerCurrent: 0,
    storeInfo: null,
    showLoginTip: false,

    showTopupModal: false,
    tiers: [],
    selectedTierIndex: -1,
  },

  onShow() {
    getApp().globalData.selectedTab = 4
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
    this._loadData()
  },

  async _loadData() {
    if (!isLoggedIn()) {
      this.setData({ showLoginTip: true })
      return
    }

    this.setData({ showLoginTip: false })

    try {
      const [profile, storeInfo] = await Promise.all([
        getMemberProfile(),
        getStoreInfo().catch(() => null),
      ])

      if (profile) {
        const memberName = (typeof profile.name === 'string' && profile.name) ? profile.name : '雪茄绅士'
        this.setData({
          member: {
            name: memberName,
            nameInitial: memberName.charAt(0) || '雪',
            balance: profile.balance || 0,
            discount: profile.discount || '无折扣',
            avatar: profile.avatarUrl || '',
            recharge: {
              level: profile.recharge.level || 1,
              levelName: profile.recharge.levelName || 'V1',
              points: profile.recharge.points || 0,
              nextLevel: profile.recharge.nextLevel || 2,
              remain: profile.recharge.remain || 0,
              progress: Math.min(100, profile.recharge.progress || 0),
            },
            consume: {
              level: profile.consume.level || 1,
              levelName: profile.consume.levelName || 'V1',
              points: profile.consume.points || 0,
              nextLevel: profile.consume.nextLevel || 2,
              remain: profile.consume.remain || 0,
              progress: Math.min(100, profile.consume.progress || 0),
            },
          },
        })
      }

      if (storeInfo) {
        this.setData({ storeInfo })
      }
    } catch {
      // 静默失败
    }
  },

  async onPullDownRefresh() {
    await this._loadData()
    wx.stopPullDownRefresh()
  },

  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current })
  },

  async topup() {
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      const rawTiers = await getRechargeTiers()
      if (rawTiers && rawTiers.length > 0) {
        const tiers = rawTiers.map(t => ({
          ...t,
          amountYuan: (Number(t.amountCents) / 100).toFixed(0),
          bonusYuan: t.bonusCents ? (Number(t.bonusCents) / 100).toFixed(0) : 0,
        }))
        this.setData({ tiers, selectedTierIndex: 0, showTopupModal: true })
      } else {
        wx.showToast({ title: '充值档位加载中', icon: 'none' })
      }
    } catch {
      wx.showToast({ title: '充值暂不可用', icon: 'none' })
    }
  },

  selectTier(e) {
    this.setData({ selectedTierIndex: e.currentTarget.dataset.index })
  },

  closeTierModal() {
    this.setData({ showTopupModal: false, selectedTierIndex: -1 })
  },

  confirmRecharge() {
    const { tiers, selectedTierIndex } = this.data
    if (selectedTierIndex < 0 || !tiers[selectedTierIndex]) return
    this.setData({ showTopupModal: false })
    this._doRecharge(tiers[selectedTierIndex])
  },

  async _doRecharge(tier) {
    wx.showLoading({ title: '充值处理中...', mask: true })
    try {
      // 1. 后端创建充值单
      const result = await recharge(tier.id)
      const rechargeNo = result && result.rechargeNo
      if (!rechargeNo) throw new Error('创建充值单失败')

      // 2. 跳过 wx.requestPayment，直接触发 mock 回调入账
      //    amount_total 传实付金额（分），后端会与 order.amountCents 对比校验
      await mockPayRecharge(rechargeNo, Number(tier.amountCents))

      wx.hideLoading()
      wx.showToast({ title: `充值 ¥${tier.amountYuan} 成功`, icon: 'success' })
      this._loadData()
    } catch {
      wx.hideLoading()
      wx.showToast({ title: '充值失败，请重试', icon: 'none' })
    }
  },

  doLogin() {
    getApp()._autoLogin().then(() => this._loadData()).catch(() => {})
  },

  viewDetail() {
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/member-transactions/index' })
  },

  onGridTap(e) {
    const idx = e.currentTarget.dataset.index
    const item = this.data.gridItems[idx]
    if (!item) return

    switch (item.handler) {
    case 'orders':
      if (!isLoggedIn()) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      // 保持底部导航栏选中状态为"会员中心"（tab 4）
      getApp().globalData.selectedTab = 4
      wx.navigateTo({ url: '/pages/orders/index' })
      break
    case 'contact':
      this._showContact()
      break
    default:
      wx.showToast({ title: item.label + ' 即将上线', icon: 'none' })
    }
  },

  _showContact() {
    const { storeInfo } = this.data
    if (storeInfo && storeInfo.phone) {
      wx.showModal({
        title: storeInfo.storeName || 'GOAT CIGAR CLUB',
        content: `电话：${storeInfo.phone}\n地址：${storeInfo.address || '门店地址'}\n营业时间：${storeInfo.businessHours || '详询店内'}`,
        confirmText: '拨打',
        success: (res) => {
          if (res.confirm) {
            wx.makePhoneCall({ phoneNumber: storeInfo.phone })
          }
        },
      })
    } else {
      wx.showToast({ title: '客服信息加载中', icon: 'none' })
    }
  },

  noop() {},

  onShareAppMessage() {
    return {
      title: 'GOAT CIGAR CLUB - 山羊雪茄俱乐部',
      path: '/pages/club/club',
      imageUrl: '/images/pure_img.png'
    }
  },
})
