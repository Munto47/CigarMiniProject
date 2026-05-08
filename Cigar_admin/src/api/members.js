import apiClient from './client'

export function getMembers(params) {
  return apiClient.get('/admin/members', { params })
}

export function getMemberDetail(id) {
  return apiClient.get(`/admin/members/${id}`)
}

export function getMemberStats() {
  return apiClient.get('/admin/members/stats')
}

export function getLevelConfig(type) {
  return apiClient.get(`/storedvalue/level-config/${type}`)
}
