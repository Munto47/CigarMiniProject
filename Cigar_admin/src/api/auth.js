import apiClient from './client'

export function adminLogin(username, password) {
  return apiClient.post('/admin/login', { username, password })
}

export function refreshToken(refreshToken) {
  return apiClient.post('/auth/refresh', { refreshToken })
}

export function changePassword(oldPassword, newPassword) {
  return apiClient.post('/admin/change-password', { oldPassword, newPassword })
}

export function wechatLogin(code, userInfo) {
  return apiClient.post('/auth/wechat-login', { code, userInfo })
}
