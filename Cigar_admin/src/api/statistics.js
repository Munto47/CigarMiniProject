import apiClient from './client'

export function getStatisticsSales(params) {
  return apiClient.get('/admin/statistics/sales', { params })
}

export function getStatisticsCategories(params) {
  return apiClient.get('/admin/statistics/categories', { params })
}

export function getStatisticsUsers(params) {
  return apiClient.get('/admin/statistics/users', { params })
}

export function getStatisticsStoredValue(params) {
  return apiClient.get('/admin/statistics/storedvalue', { params })
}

export function exportStatistics(params) {
  return apiClient.get('/admin/statistics/export', { params })
}
