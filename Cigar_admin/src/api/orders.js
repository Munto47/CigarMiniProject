import apiClient, { genIdempotencyKey } from './client'

// === 用户端（公开） ===
export function createOrder(data) {
  return apiClient.post('/orders', data, { idempotencyKey: genIdempotencyKey() })
}

// === 管理端 ===
export function getOrders(params) {
  return apiClient.get('/admin/orders', { params })
}

export function getOrderDetail(id) {
  return apiClient.get(`/admin/orders/${id}`)
}

export function updateOrderStatus(id, data) {
  return apiClient.patch(`/admin/orders/${id}/status`, data)
}

export function refundOrder(id, data) {
  return apiClient.post(`/admin/orders/${id}/refund`, data, {
    idempotencyKey: genIdempotencyKey(),
  })
}

export function syncMeituan() {
  return apiClient.post('/admin/orders/sync-meituan')
}
