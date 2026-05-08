import apiClient from './client'

export function getSettings() {
  return apiClient.get('/admin/settings')
}

export function updateSetting(key, data) {
  return apiClient.put(`/admin/settings/${key}`, data)
}

export function getOperationLogs(params) {
  return apiClient.get('/admin/settings/logs', { params })
}

export function testMeituanConnection() {
  return apiClient.post('/admin/settings/meituan/test')
}

export function getStoreInfo() {
  return apiClient.get('/admin/settings/public/store-info')
}
