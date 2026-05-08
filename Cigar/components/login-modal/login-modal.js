const { wechatLogin } = require('../../utils/api')
const { saveTokens, saveUserInfo } = require('../../utils/request')

Component({
  properties: {
    visible: { type: Boolean, value: false }
  },

  data: {
    loading: false
  },

  methods: {
    noop() {},

    onSkip() {
      this.triggerEvent('close')
    },

    onLogin() {
      if (this.data.loading) return
      this.setData({ loading: true })

      wx.login({
        success: async ({ code }) => {
          try {
            const res = await wechatLogin(code)
            saveTokens(res.accessToken, res.refreshToken)
            // 后端返回字段是 user 不是 userInfo
            if (res.user) saveUserInfo(res.user)
            wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 })
            this.triggerEvent('success')
          } catch {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          } finally {
            this.setData({ loading: false })
          }
        },
        fail: () => {
          this.setData({ loading: false })
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      })
    }
  }
})
