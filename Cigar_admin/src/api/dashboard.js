import apiClient from './client'

export function getOverview() {
  return apiClient.get('/admin/dashboard/overview')
}

export function getSalesTrend(days = 7) {
  return apiClient.get('/admin/dashboard/sales-trend', { params: { days } })
}

export function getRecentOrders(limit = 10) {
  return apiClient.get('/admin/dashboard/recent-orders', { params: { limit } })
}

export function getTopProducts(limit = 10) {
  return apiClient.get('/admin/dashboard/top-products', { params: { limit } })
}
