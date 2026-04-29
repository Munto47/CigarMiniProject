const GRID_ITEMS = [
  { icon: '📋', label: '我的订单', path: '' },
  { icon: '♡',  label: '收藏夹',   path: '' },
  { icon: '◈',  label: '优惠券',   path: '' },
  { icon: '◎',  label: '俱乐部活动', path: '' },
  { icon: '◆',  label: '品鉴预约', path: '' },
  { icon: '☎',  label: '联系客服', path: '' }
]

const MOCK_BANNERS = [
  { id: 1, title: '6 月品鉴之夜', desc: '古巴名品限时品鉴活动', bg: '#1A1008' },
  { id: 2, title: '新品上架', desc: 'Cohiba 2024 年度限定版', bg: '#0A0F0A' },
  { id: 3, title: '会员日特权', desc: '双倍积分·专属折扣', bg: '#100A14' }
]

Page({
  data: {
    member: {
      name: '雪茄绅士',
      balance: 3680,
      discount: '9.0 折',
      recharge: {
        level: 8,
        points: 7350,
        nextLevel: 9,
        remain: 650,
        progress: 91.9   // 7350 / 8000 * 100
      },
      consume: {
        level: 7,
        points: 6820,
        nextLevel: 8,
        remain: 180,
        progress: 97.4   // 6820 / 7000 * 100
      }
    },
    gridItems: GRID_ITEMS,
    banners: MOCK_BANNERS,
    bannerCurrent: 0
  },

  onShow() {
    getApp().globalData.selectedTab = 4
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
  },

  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current })
  },

  topup() {
    wx.showToast({ title: '充值功能开发中', icon: 'none' })
  },

  viewDetail(idx) {
    const item = this.data.gridItems[idx]
    if (item.path) wx.navigateTo({ url: item.path })
    else wx.showToast({ title: item.label + ' 即将上线', icon: 'none' })
  },

  onGridTap(e) {
    this.viewDetail(e.currentTarget.dataset.index)
  },

  onShareAppMessage() {
    return {
      title: 'GOAT CIGAR CLUB - 山羊雪茄俱乐部',
      path: '/pages/club/club',
      imageUrl: '/images/pure_img.png'
    }
  }
})
