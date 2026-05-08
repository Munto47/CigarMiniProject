import apiClient from './client'

// === 评价管理 ===
export function getReviews(params) {
  return apiClient.get('/admin/reviews', { params })
}

export function moderateReview(id, data) {
  return apiClient.put(`/admin/reviews/${id}/moderate`, data)
}

export function deleteReview(id) {
  return apiClient.delete(`/admin/reviews/${id}`)
}

// === 敏感词 ===
export function getSensitiveWords(params) {
  return apiClient.get('/admin/reviews/sensitive-words', { params })
}

export function createSensitiveWord(data) {
  return apiClient.post('/admin/reviews/sensitive-words', data)
}

export function deleteSensitiveWord(id) {
  return apiClient.delete(`/admin/reviews/sensitive-words/${id}`)
}
