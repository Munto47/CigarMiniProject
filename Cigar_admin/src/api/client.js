import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：自动附加 accessToken
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // 幂等键：若调用方传入 idempotencyKey，自动加到 header
  if (config.idempotencyKey) {
    config.headers['Idempotency-Key'] = config.idempotencyKey
  }
  return config
})

// 响应拦截器：统一错误处理 + token 刷新
let isRefreshing = false
let refreshSubscribers = []

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

apiClient.interceptors.response.use(
  (response) => {
    // 统一响应体：{ code, message, data }
    const body = response.data
    if (body && typeof body.code === 'number' && body.code !== 0) {
      const err = new Error(body.message || '请求失败')
      err.code = body.code
      err.response = response
      return Promise.reject(err)
    }
    return response
  },
  async (error) => {
    const { response, config } = error
    if (!response) {
      // 网络错误
      return Promise.reject(error)
    }

    // Token 过期 (1001) 或无效 (1002)，尝试刷新
    const body = response.data
    if (body?.code === 1001 && !config._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            config.headers.Authorization = `Bearer ${newToken}`
            config._retry = true
            resolve(apiClient(config))
          })
        })
      }

      isRefreshing = true
      config._retry = true

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefreshToken } = res.data.data
        localStorage.setItem('access_token', accessToken)
        if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken)
        isRefreshing = false
        onRefreshed(accessToken)
        config.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(config)
      } catch (refreshErr) {
        isRefreshing = false
        refreshSubscribers = []
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      }
    }

    // 1006: 必须修改密码
    if (body?.code === 1006) {
      localStorage.setItem('must_change_password', 'true')
      window.location.href = '/change-password'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  },
)

/**
 * 生成 UUID v4 格式的幂等键
 */
export function genIdempotencyKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default apiClient
