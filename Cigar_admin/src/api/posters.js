import apiClient from './client'

export function getPosters(params) {
  return apiClient.get('/admin/posters', { params })
}

export function getPosterTemplate() {
  return apiClient.get('/admin/posters/template')
}

export function updatePosterTemplate(data) {
  return apiClient.put('/admin/posters/template', data)
}
