// app.js
const { wechatLogin } = require('./utils/api')
const { saveTokens, saveUserInfo, getAccessToken } = require('./utils/request')

App({
  globalData: {
    selectedTab: 0,
    cartCount: 0,
  },

  onLaunch() {
    this._autoLogin()
  },

  async _autoLogin() {
    if (getAccessToken()) return

    wx.login({
      success: async ({ code }) => {
        try {
          const res = await wechatLogin(code)
          saveTokens(res.accessToken, res.refreshToken)
          if (res.user) saveUserInfo(res.user)
        } catch {
          // 后端不可用 → 进入本地演示模式，保存演示 token 使各页面正常展示
          saveTokens('demo_local', '')
          saveUserInfo({ userId: 1, nickname: '雪茄绅士' })
        }
      },
      fail: () => {
        saveTokens('demo_local', '')
        saveUserInfo({ userId: 1, nickname: '雪茄绅士' })
      }
    })
  },

  // 全局更新购物车角标
  updateCartBadge(count) {
    this.globalData.cartCount = count
    const pages = getCurrentPages()
    if (!pages.length) return
    const currentPage = pages[pages.length - 1]
    const tabBar = currentPage.getTabBar && currentPage.getTabBar()
    if (tabBar) tabBar.setData({ cartCount: count })
  },
})
