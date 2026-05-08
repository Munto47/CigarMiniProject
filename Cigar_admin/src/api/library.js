import apiClient from './client'

// === 雪茄库 ===
export function getInstoreCigars(params) {
  return apiClient.get('/admin/library/instore', { params })
}

export function createInstoreCigar(data) {
  return apiClient.post('/admin/library/instore', data)
}

export function updateInstoreCigar(id, data) {
  return apiClient.put(`/admin/library/instore/${id}`, data)
}

export function deleteInstoreCigar(id) {
  return apiClient.delete(`/admin/library/instore/${id}`)
}

export function syncInstore() {
  return apiClient.post('/admin/library/instore/sync')
}

// === 行业参考库 ===
export function getReferenceCigars(params) {
  return apiClient.get('/admin/library/reference', { params })
}

export function createReferenceCigar(data) {
  return apiClient.post('/admin/library/reference', data)
}

export function updateReferenceCigar(id, data) {
  return apiClient.put(`/admin/library/reference/${id}`, data)
}

export function deleteReferenceCigar(id) {
  return apiClient.delete(`/admin/library/reference/${id}`)
}

// === 风味标签 ===
export function getFlavorTags(params) {
  return apiClient.get('/admin/library/tags', { params })
}

export function createFlavorTag(data) {
  return apiClient.post('/admin/library/tags', data)
}

export function updateFlavorTag(id, data) {
  return apiClient.put(`/admin/library/tags/${id}`, data)
}

export function deleteFlavorTag(id) {
  return apiClient.delete(`/admin/library/tags/${id}`)
}
