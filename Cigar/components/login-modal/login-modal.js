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
      const app = getApp()
      Promise.resolve(app && app._autoLogin
        ? app._autoLogin({ silent: false, force: true })
        : Promise.reject(new Error('登录能力不可用')))
        .then(() => {
          wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 })
          this.triggerEvent('success')
        })
        .catch(() => {
          // 失败提示已由全局登录方法统一处理
        })
        .finally(() => {
          this.setData({ loading: false })
        })
    }
  }
})
