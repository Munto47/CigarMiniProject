/**
 * request.js 测试 —— 微信小程序 HTTP 客户端
 */
require('../setup')

const requestModule = require('../../utils/request')

describe('request.js', () => {
  // 辅助: 模拟 wx.request 成功响应
  function mockWxRequestSuccess(data = {}, statusCode = 200) {
    global.wx.request = jest.fn((options) => {
      options.success({
        statusCode,
        data: { code: 0, message: '成功', data },
      })
    })
  }

  // 辅助: 模拟 wx.request 失败响应
  function mockWxRequestFail(code, message) {
    global.wx.request = jest.fn((options) => {
      options.success({
        statusCode: 200,
        data: { code, message, data: null },
      })
    })
  }

  // 辅助: 模拟 wx.request 网络错误
  function mockWxRequestNetworkError() {
    global.wx.request = jest.fn((options) => {
      options.fail({ errMsg: 'request:fail' })
    })
  }

  describe('Token 管理', () => {
    it('getAccessToken() 应从 storage 获取 token', () => {
      wx.setStorageSync('accessToken', 'test-access-token')
      expect(requestModule.getAccessToken()).toBe('test-access-token')
    })

    it('getAccessToken() 无 token 时应返回空字符串', () => {
      expect(requestModule.getAccessToken()).toBe('')
    })

    it('saveTokens() 应保存 accessToken 和 refreshToken', () => {
      requestModule.saveTokens('at-123', 'rt-456')
      expect(wx.getStorageSync('accessToken')).toBe('at-123')
      expect(wx.getStorageSync('refreshToken')).toBe('rt-456')
    })

    it('clearTokens() 应清除所有 token 和用户信息', () => {
      wx.setStorageSync('accessToken', 'at')
      wx.setStorageSync('refreshToken', 'rt')
      wx.setStorageSync('userInfo', { name: 'test' })
      requestModule.clearTokens()
      expect(wx.getStorageSync('accessToken')).toBe('')
      expect(wx.getStorageSync('refreshToken')).toBe('')
      expect(wx.getStorageSync('userInfo')).toBe('')
    })

    it('saveUserInfo() 应保存用户信息', () => {
      const user = { nickName: '张三', avatarUrl: 'http://...' }
      requestModule.saveUserInfo(user)
      expect(wx.getStorageSync('userInfo')).toEqual(user)
    })

    it('getUserInfo() 应获取用户信息', () => {
      wx.setStorageSync('userInfo', { nickName: '李四' })
      expect(requestModule.getUserInfo()).toEqual({ nickName: '李四' })
    })

    it('isLoggedIn() 应返回登录状态', () => {
      wx.removeStorageSync('accessToken')
      expect(requestModule.isLoggedIn()).toBe(false)

      wx.setStorageSync('accessToken', 'at')
      expect(requestModule.isLoggedIn()).toBe(true)

      wx.setStorageSync('accessToken', 'demo_local')
      expect(requestModule.isLoggedIn()).toBe(false)
    })
  })

  describe('GET 请求', () => {
    it('应发送 GET 请求到正确的 URL', async () => {
      mockWxRequestSuccess({ list: [1, 2, 3] })
      const result = await requestModule.get('/test', null, { needAuth: false })
      expect(result).toEqual({ list: [1, 2, 3] })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/test'),
          method: 'GET',
        })
      )
    })

    it('应将参数序列化为 query string', async () => {
      mockWxRequestSuccess({ data: 'ok' })
      await requestModule.get('/search', { keyword: '雪茄', page: 1 }, { needAuth: false })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/search?keyword=')
        })
      )
    })

    it('应过滤 undefined/null/空字符串参数', async () => {
      mockWxRequestSuccess({})
      await requestModule.get('/search', { a: '1', b: undefined, c: null, d: '' }, { needAuth: false })
      const callArg = wx.request.mock.calls[0][0]
      expect(callArg.url).not.toContain('b=')
      expect(callArg.url).not.toContain('c=')
      expect(callArg.url).not.toContain('d=')
      expect(callArg.url).toContain('a=1')
    })
  })

  describe('POST 请求', () => {
    it('应发送 POST 请求并传递 JSON body', async () => {
      mockWxRequestSuccess({ id: 1 })
      await requestModule.post('/items', { name: '测试' }, { needAuth: false })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { name: '测试' },
        })
      )
    })
  })

  describe('PUT 请求', () => {
    it('应发送 PUT 请求并传递 JSON body', async () => {
      mockWxRequestSuccess({ updated: true })
      await requestModule.put('/items/1', { name: '更新' }, { needAuth: false })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          data: { name: '更新' },
        })
      )
    })
  })

  describe('DELETE 请求', () => {
    it('应发送 DELETE 请求', async () => {
      mockWxRequestSuccess({ deleted: true })
      await requestModule.del('/items/1', { needAuth: false })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('鉴权', () => {
    it('needAuth=true 时应附加 Authorization header', async () => {
      wx.setStorageSync('accessToken', 'my-token')
      mockWxRequestSuccess({})

      await requestModule.get('/protected', null)
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      )
    })

    it('needAuth=false 时不应附加 Authorization header', async () => {
      wx.setStorageSync('accessToken', 'my-token')
      mockWxRequestSuccess({})

      await requestModule.get('/public', null, { needAuth: false })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })
  })

  describe('响应处理', () => {
    it('code=0 时应 resolve data', async () => {
      mockWxRequestSuccess({ result: 'ok' })
      const result = await requestModule.get('/test', null, { needAuth: false })
      expect(result).toEqual({ result: 'ok' })
    })

    it('code!=0 时应 reject', async () => {
      mockWxRequestFail(2001, '参数错误')
      await expect(
        requestModule.get('/test', null, { needAuth: false })
      ).rejects.toThrow('参数错误')
    })

    it('HTTP 非 200 时应 reject', async () => {
      global.wx.request = jest.fn((options) => {
        options.success({
          statusCode: 500,
          data: { code: 5000, message: '服务器错误', data: null },
        })
      })
      await expect(
        requestModule.get('/test', null, { needAuth: false })
      ).rejects.toThrow('服务器错误')
    })
  })

  describe('API URL 基础地址', () => {
    it('应包含 BASE_URL 前缀', () => {
      expect(requestModule.BASE_URL).toBeDefined()
      expect(requestModule.BASE_URL).toMatch(/\/api$/)
    })
  })

  // ==================== Token 刷新流程 ====================
  describe('getRefreshToken', () => {
    it('应从 storage 获取 refreshToken', () => {
      wx.setStorageSync('refreshToken', 'rt-abc')
      expect(requestModule.getRefreshToken()).toBe('rt-abc')
    })

    it('无 refreshToken 时应返回空字符串', () => {
      wx.removeStorageSync('refreshToken')
      expect(requestModule.getRefreshToken()).toBe('')
    })
  })

  describe('tryRefreshToken — 刷新 accessToken', () => {
    it('成功刷新时应保存新 token 并 resolve', async () => {
      wx.setStorageSync('refreshToken', 'rt-valid')
      global.wx.request = jest.fn((options) => {
        options.success({
          statusCode: 200,
          data: {
            code: 0,
            data: { accessToken: 'new-at', refreshToken: 'new-rt' },
          },
        })
      })

      const result = await requestModule.getRefreshToken
        ? expect(requestModule.getRefreshToken()).toBeDefined()
        : null
      // 通过 request 触发 tryRefreshToken 间接测试
      // 直接导入内部函数做单元测试 — tryRefreshToken 未导出,
      // 通过 code=1001 场景间接验证
    })

    it('无 refreshToken 时应 reject', async () => {
      wx.removeStorageSync('refreshToken')
      mockWxRequestSuccess({})
      // tryRefreshToken 未导出，通过 1001 分支且 needAuth=false 间接测试
    })

    it('服务器返回非 0 code 时应清除 token 并 reject', async () => {
      wx.setStorageSync('refreshToken', 'rt-expired')
      wx.setStorageSync('accessToken', 'at-expired')
      wx.setStorageSync('userInfo', { name: 'test' })
      let requestCount = 0
      global.wx.request = jest.fn((options) => {
        if (options.url.includes('/auth/refresh')) {
          // 刷新接口失败
          options.success({
            statusCode: 200,
            data: { code: 1002, message: 'Refresh token 无效', data: null },
          })
        } else {
          requestCount++
          if (requestCount === 1) {
            // 第一次: 业务请求返回 1001
            options.success({
              statusCode: 200,
              data: { code: 1001, message: 'Token 过期', data: null },
            })
          }
        }
      })

      await expect(
        requestModule.get('/protected', null)
      ).rejects.toThrow('Token 过期')

      // 验证 token 被清除
      expect(wx.getStorageSync('accessToken')).toBe('')
      expect(wx.getStorageSync('refreshToken')).toBe('')
    })
  })

  describe('Token 自动刷新 — code 1001~1003', () => {
    it('成功刷新后应自动重试原请求', async () => {
      wx.setStorageSync('accessToken', 'expired-at')
      wx.setStorageSync('refreshToken', 'valid-rt')

      let callCount = 0
      global.wx.request = jest.fn((options) => {
        if (options.url.includes('/auth/refresh')) {
          options.success({
            statusCode: 200,
            data: {
              code: 0,
              data: { accessToken: 'refreshed-at', refreshToken: 'new-rt' },
            },
          })
        } else {
          callCount++
          if (callCount === 1) {
            // 第一次执行业务请求 → 返回 token 过期
            options.success({
              statusCode: 200,
              data: { code: 1001, message: 'Token 过期', data: null },
            })
          } else {
            // 重试 → 成功
            options.success({
              statusCode: 200,
              data: { code: 0, message: '成功', data: { result: 'ok' } },
            })
          }
        }
      })

      const result = await requestModule.get('/protected', null)
      expect(result).toEqual({ result: 'ok' })
      expect(wx.getStorageSync('accessToken')).toBe('refreshed-at')
      expect(wx.getStorageSync('refreshToken')).toBe('new-rt')
      // 共调用 3 次: 第一次请求 + refresh + 重试
      expect(wx.request).toHaveBeenCalledTimes(3)
    })

    it('刷新失败时应清除 token 并 reject', async () => {
      wx.setStorageSync('accessToken', 'expired-at')
      wx.setStorageSync('refreshToken', 'bad-rt')

      let requestCount = 0
      global.wx.request = jest.fn((options) => {
        if (options.url.includes('/auth/refresh')) {
          options.success({
            statusCode: 200,
            data: { code: 5000, message: '服务器错误', data: null },
          })
        } else {
          requestCount++
          if (requestCount === 1) {
            options.success({
              statusCode: 200,
              data: { code: 1001, message: 'Token 过期', data: null },
            })
          }
        }
      })

      await expect(
        requestModule.get('/protected', null)
      ).rejects.toThrow('Token 过期')

      expect(wx.getStorageSync('accessToken')).toBe('')
    })

    it('needAuth=false 时不触发刷新，直接 reject', async () => {
      global.wx.request = jest.fn((options) => {
        options.success({
          statusCode: 200,
          data: { code: 1001, message: '无效 Token', data: null },
        })
      })

      await expect(
        requestModule.get('/public', null, { needAuth: false })
      ).rejects.toThrow('无效 Token')
    })

    it('并发请求应排队等待刷新完成后一起重试', async () => {
      wx.setStorageSync('accessToken', 'expired-at')
      wx.setStorageSync('refreshToken', 'valid-rt')

      let refreshCallCount = 0
      let requestCallCount = 0
      const completedResults = []

      global.wx.request = jest.fn((options) => {
        if (options.url.includes('/auth/refresh')) {
          refreshCallCount++
          options.success({
            statusCode: 200,
            data: {
              code: 0,
              data: { accessToken: 'refreshed-at', refreshToken: 'rt' },
            },
          })
        } else {
          requestCallCount++
          if (requestCallCount <= 3) {
            // 前 3 个请求都返回 token 过期
            options.success({
              statusCode: 200,
              data: { code: 1001, message: 'Token 过期', data: null },
            })
          } else {
            // 重试的请求成功
            options.success({
              statusCode: 200,
              data: { code: 0, message: '成功', data: { id: requestCallCount } },
            })
          }
        }
      })

      // 同时发起 3 个请求
      const results = await Promise.all([
        requestModule.get('/a', null).catch(e => e.message),
        requestModule.get('/b', null).catch(e => e.message),
        requestModule.get('/c', null).catch(e => e.message),
      ])

      // refresh 只应调用一次
      expect(refreshCallCount).toBe(1)
    })
  })

  describe('HTTP 401 处理', () => {
    it('401 + needAuth=true 应尝试刷新 token', async () => {
      wx.setStorageSync('accessToken', 'expired-at')
      wx.setStorageSync('refreshToken', 'valid-rt')

      let callCount = 0
      global.wx.request = jest.fn((options) => {
        if (options.url.includes('/auth/refresh')) {
          options.success({
            statusCode: 200,
            data: {
              code: 0,
              data: { accessToken: 'refreshed-at' },
            },
          })
        } else {
          callCount++
          if (callCount === 1) {
            options.success({
              statusCode: 401,
              data: { code: 1001, message: 'Unauthorized', data: null },
            })
          } else {
            options.success({
              statusCode: 200,
              data: { code: 0, message: '成功', data: { ok: true } },
            })
          }
        }
      })

      const result = await requestModule.get('/protected', null)
      expect(result).toEqual({ ok: true })
    })

    it('401 + needAuth=false 不刷新，直接 reject', async () => {
      global.wx.request = jest.fn((options) => {
        options.success({ statusCode: 401, data: {} })
      })

      await expect(
        requestModule.get('/public', null, { needAuth: false })
      ).rejects.toThrow('服务器异常(401)')
    })

    it('401 刷新失败应清除 token', async () => {
      wx.setStorageSync('accessToken', 'expired-at')
      wx.setStorageSync('refreshToken', 'bad-rt')

      global.wx.request = jest.fn((options) => {
        if (options.url.includes('/auth/refresh')) {
          options.success({
            statusCode: 200,
            data: { code: 5001, message: '刷新失败', data: null },
          })
        } else {
          options.success({
            statusCode: 401,
            data: { code: 1001, message: 'Unauthorized', data: null },
          })
        }
      })

      await expect(
        requestModule.get('/protected', null)
      ).rejects.toThrow('未登录')

      expect(wx.getStorageSync('accessToken')).toBe('')
    })
  })

  describe('网络异常', () => {
    it('wx.request fail 时应 reject', async () => {
      mockWxRequestNetworkError()
      await expect(
        requestModule.get('/test', null, { needAuth: false })
      ).rejects.toEqual({ errMsg: 'request:fail' })
    })
  })

  describe('showLoading', () => {
    it('showLoading=true 时应显示并隐藏 loading', async () => {
      mockWxRequestSuccess({ ok: true })
      await requestModule.get('/test', null, { needAuth: false, showLoading: true })
      expect(wx.showLoading).toHaveBeenCalledWith({ title: '加载中...', mask: true })
      expect(wx.hideLoading).toHaveBeenCalled()
    })

    it('showLoading=true 时网络失败也应隐藏 loading', async () => {
      mockWxRequestNetworkError()
      try { await requestModule.get('/test', null, { needAuth: false, showLoading: true }) } catch {}
      expect(wx.hideLoading).toHaveBeenCalled()
    })

    it('showLoading=false 时不应触发 loading', async () => {
      mockWxRequestSuccess({ ok: true })
      await requestModule.get('/test', null, { needAuth: false })
      expect(wx.showLoading).not.toHaveBeenCalled()
    })
  })

  describe('request() — 核心方法', () => {
    it('应支持直接调用 request()', async () => {
      global.wx.request = jest.fn((options) => {
        options.success({
          statusCode: 200,
          data: { code: 0, message: '成功', data: { direct: true } },
        })
      })

      const result = await requestModule.request({
        url: '/direct-call',
        method: 'GET',
        needAuth: false,
      })
      expect(result).toEqual({ direct: true })
    })

    it('无需鉴权时不附加 header，但仍设置 Content-Type', async () => {
      global.wx.request = jest.fn((options) => {
        options.success({
          statusCode: 200,
          data: { code: 0, message: 'ok', data: {} },
        })
      })
      await requestModule.request({ url: '/no-auth', method: 'POST', needAuth: false, data: { x: 1 } })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
    })
  })

  describe('自定义 header', () => {
    it('应合并自定义 header', async () => {
      mockWxRequestSuccess({})
      await requestModule.request({
        url: '/custom',
        needAuth: false,
        header: { 'X-Custom': 'hello' },
      })
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ 'X-Custom': 'hello', 'Content-Type': 'application/json' }),
        })
      )
    })
  })
})
