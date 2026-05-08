import apiClient from './client'

export function getAccounts(params) {
  return apiClient.get('/admin/accounts', { params })
}

export function getAccount(id) {
  return apiClient.get(`/admin/accounts/${id}`)
}

export function createAccount(data) {
  return apiClient.post('/admin/accounts', data)
}

export function updateAccount(id, data) {
  return apiClient.put(`/admin/accounts/${id}`, data)
}

export function deleteAccount(id) {
  return apiClient.delete(`/admin/accounts/${id}`)
}

export function getLoginLogs(params) {
  return apiClient.get('/admin/login-logs', { params })
}
