// app.js
const { wechatLogin } = require('./utils/api')
const { saveTokens, saveUserInfo, getAccessToken, clearTokens } = require('./utils/request')

App({
  globalData: {
    selectedTab: 0,
    cartCount: 0,
  },

  onLaunch() {
    this._autoLogin({ silent: true }).catch(() => {})
  },

  async _autoLogin(options = {}) {
    const { silent = true, force = false } = options

    if (this._loginPromise) {
      return this._loginPromise
    }

    if (!force && getAccessToken()) {
      return
    }

    this._loginPromise = new Promise((resolve, reject) => {
      wx.login({
        success: async ({ code }) => {
          if (!code) {
            clearTokens()
            const err = new Error('未获取到微信登录凭证')
            if (!silent) {
              wx.showToast({ title: '登录失败，请重试', icon: 'none' })
            }
            this._loginPromise = null
            reject(err)
            return
          }

          try {
            const res = await wechatLogin(code)
            if (!res || !res.accessToken) {
              throw new Error('登录响应缺少 accessToken')
            }
            saveTokens(res.accessToken, res.refreshToken)
            if (res.user) saveUserInfo(res.user)
            resolve(res)
          } catch (err) {
            clearTokens()
            if (!silent) {
              wx.showToast({ title: '登录失败，请重试', icon: 'none' })
            }
            reject(err)
          } finally {
            this._loginPromise = null
          }
        },
        fail: (err) => {
          clearTokens()
          if (!silent) {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          }
          this._loginPromise = null
          reject(err || new Error('微信登录失败'))
        }
      })
    })

    return this._loginPromise
  },

  promptLogin(options = {}) {
    const {
      message = '当前操作需要登录，是否立即登录？',
      onSuccess,
      onCancel,
      onFail,
    } = options

    if (this._loginPromptVisible) {
      return Promise.resolve(false)
    }

    this._loginPromptVisible = true

    return new Promise((resolve) => {
      wx.showModal({
        title: '登录提示',
        content: message,
        confirmText: '立即登录',
        cancelText: '稍后再说',
        success: async ({ confirm }) => {
          if (!confirm) {
            this._loginPromptVisible = false
            if (typeof onCancel === 'function') onCancel()
            resolve(false)
            return
          }

          try {
            await this._autoLogin({ silent: false, force: true })
            this._loginPromptVisible = false
            if (typeof onSuccess === 'function') onSuccess()
            resolve(true)
          } catch (err) {
            this._loginPromptVisible = false
            if (typeof onFail === 'function') onFail(err)
            resolve(false)
          }
        },
        fail: () => {
          this._loginPromptVisible = false
          resolve(false)
        }
      })
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
