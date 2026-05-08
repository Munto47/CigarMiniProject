import apiClient from './client'

// === 雪茄 ===
export function getCigars(params) {
  return apiClient.get('/admin/products/cigars', { params })
}

export function getCigar(id) {
  return apiClient.get(`/admin/products/cigars/${id}`)
}

export function createCigar(data) {
  return apiClient.post('/admin/products/cigars', data)
}

export function updateCigar(id, data) {
  return apiClient.put(`/admin/products/cigars/${id}`, data)
}

export function deleteCigar(id) {
  return apiClient.delete(`/admin/products/cigars/${id}`)
}

// === 饮品 ===
export function getDrinks(params) {
  return apiClient.get('/admin/products/drinks', { params })
}

export function getDrink(id) {
  return apiClient.get(`/admin/products/drinks/${id}`)
}

export function createDrink(data) {
  return apiClient.post('/admin/products/drinks', data)
}

export function updateDrink(id, data) {
  return apiClient.put(`/admin/products/drinks/${id}`, data)
}

export function deleteDrink(id) {
  return apiClient.delete(`/admin/products/drinks/${id}`)
}
