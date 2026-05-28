/**
 * CigarPro 小程序 HTTP 客户端
 *
 * 封装 wx.request，提供 Token 管理、自动刷新、错误处理
 */

// 根据运行环境自动切换后端地址（develop/trial → 本地，release → 生产）
const _env = typeof __wxConfig !== 'undefined' ? __wxConfig.envVersion : 'develop'
const BASE_URL = _env === 'release'
  ? 'https://cigar.ruimacode.cn/api'
  : 'http://localhost:3000/api'

// Token 存储 key
const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_INFO_KEY = 'userInfo'
const DEMO_ACCESS_TOKEN = 'demo_local'

// 是否正在刷新 token（防止并发刷新）
let refreshing = false
let refreshQueue = []
let loginPrompting = false

/**
 * 获取存储的 accessToken
 */
function getAccessToken() {
  return wx.getStorageSync(ACCESS_TOKEN_KEY) || ''
}

/**
 * 获取存储的 refreshToken
 */
function getRefreshToken() {
  return wx.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

/**
 * 保存 token
 */
function saveTokens(accessToken, refreshToken) {
  wx.setStorageSync(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    wx.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
  }
}

/**
 * 清除 token（登出时使用）
 */
function clearTokens() {
  wx.removeStorageSync(ACCESS_TOKEN_KEY)
  wx.removeStorageSync(REFRESH_TOKEN_KEY)
  wx.removeStorageSync(USER_INFO_KEY)
}

/**
 * 保存用户信息
 */
function saveUserInfo(userInfo) {
  wx.setStorageSync(USER_INFO_KEY, userInfo)
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return wx.getStorageSync(USER_INFO_KEY) || null
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  const accessToken = getAccessToken()
  return !!accessToken && accessToken !== DEMO_ACCESS_TOKEN
}

function promptLogin(message = '请先登录后继续操作') {
  if (loginPrompting) return

  loginPrompting = true

  const done = () => {
    loginPrompting = false
  }

  const app = typeof getApp === 'function' ? getApp() : null
  if (app && typeof app.promptLogin === 'function') {
    Promise.resolve(app.promptLogin({ message }))
      .finally(done)
    return
  }

  wx.showModal({
    title: '登录提示',
    content: message,
    showCancel: false,
    complete: done,
  })
}

/**
 * 尝试刷新 accessToken
 * 返回 Promise，成功 resolve 新 token，失败 reject
 */
function tryRefreshToken() {
  return new Promise((resolve, reject) => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      reject(new Error('无刷新令牌'))
      return
    }

    wx.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      success: (res) => {
        if ((res.statusCode === 200 || res.statusCode === 201) && res.data.code === 0) {
          const { accessToken, refreshToken: newRefreshToken } = res.data.data
          saveTokens(accessToken, newRefreshToken || refreshToken)
          resolve(accessToken)
        } else {
          clearTokens()
          reject(new Error('刷新令牌失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 核心请求方法
 *
 * @param {Object} options
 * @param {string} options.url       - 请求路径（不含 base URL）
 * @param {string} options.method    - HTTP 方法，默认 GET
 * @param {Object} options.data      - 请求体（POST/PUT）
 * @param {Object} options.header    - 额外请求头
 * @param {boolean} options.needAuth - 是否需要鉴权，默认 true
 * @param {boolean} options.showLoading - 是否显示 loading，默认 false
 * @returns {Promise<Object>} 直接返回 res.data.data（已解包）
 */
function request(options = {}) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    needAuth = true,
    showLoading = false,
    silent = false,
  } = options

  return new Promise((resolve, reject) => {
    if (showLoading) {
      wx.showLoading({ title: '加载中...', mask: true })
    }

    const doRequest = () => {
      const headers = {
        'Content-Type': 'application/json',
        ...header,
      }

      if (needAuth) {
        const token = getAccessToken()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      }

      wx.request({
        url: `${BASE_URL}${url}`,
        method,
        data,
        header: headers,
        timeout: 30000,
        success: (res) => {
          if (showLoading) wx.hideLoading()

          if (res.statusCode === 200 || res.statusCode === 201) {
            const { code, message, data: respData } = res.data

            if (code === 0) {
              resolve(respData)
            } else if (code >= 1001 && code <= 1003) {
              // Token 过期或无效
              if (needAuth && !refreshing) {
                refreshing = true
                tryRefreshToken()
                  .then(() => {
                    refreshing = false
                    // 重试队列中的请求
                    refreshQueue.forEach(task => task.retry())
                    refreshQueue = []
                    // 重试当前请求
                    doRequest()
                  })
                  .catch(() => {
                    const authError = new Error(message || '未登录')
                    refreshing = false
                    refreshQueue.forEach(task => task.reject(authError))
                    refreshQueue = []
                    clearTokens()
                    if (!silent) promptLogin('登录已过期，请重新登录')
                    reject(authError)
                  })
              } else if (refreshing) {
                // 加入等待队列
                refreshQueue.push({ retry: doRequest, reject })
              } else {
                if (needAuth) clearTokens()
                reject(new Error(message || '未登录'))
              }
            } else {
              wx.showToast({ title: message || '请求失败', icon: 'none', duration: 2000 })
              reject(new Error(message))
            }
          } else if (res.statusCode === 401 && needAuth) {
            // HTTP 401 - 可能 Guard 拦截，尝试刷新
            if (!refreshing) {
              refreshing = true
              tryRefreshToken()
                .then(() => {
                  refreshing = false
                  refreshQueue.forEach(task => task.retry())
                  refreshQueue = []
                  doRequest()
                })
                .catch(() => {
                  const authError = new Error('未登录')
                  refreshing = false
                  refreshQueue.forEach(task => task.reject(authError))
                  refreshQueue = []
                  clearTokens()
                  if (!silent) promptLogin('请先登录后继续操作')
                  reject(authError)
                })
            } else {
              refreshQueue.push({ retry: doRequest, reject })
            }
          } else {
            const errMsg = (res.data && (res.data.message || res.data.error)) || `服务器异常(${res.statusCode})`
            if (!silent) {
              wx.showToast({ title: errMsg, icon: 'none' })
            }
            reject(new Error(errMsg))
          }
        },
        fail: (err) => {
          if (showLoading) wx.hideLoading()
          if (!silent) wx.showToast({ title: '网络异常，请检查网络连接', icon: 'none', duration: 2000 })
          reject(err)
        }
      })
    }

    doRequest()
  })
}

/**
 * 便捷方法
 */
function get(url, params, options) {
  const query = params ? '?' + Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&') : ''
  return request({ ...options, url: url + query, method: 'GET' })
}

function post(url, data, options) {
  return request({ ...options, url, method: 'POST', data })
}

function put(url, data, options) {
  return request({ ...options, url, method: 'PUT', data })
}

function del(url, options) {
  return request({ ...options, url, method: 'DELETE' })
}

module.exports = {
  BASE_URL,
  request,
  get,
  post,
  put,
  del,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  saveUserInfo,
  getUserInfo,
  isLoggedIn,
  promptLogin,
}
