import apiClient, { genIdempotencyKey } from './client'

// === 充值档位 ===
export function getRechargeTiers(params) {
  return apiClient.get('/admin/storedvalue/tiers', { params })
}

export function createRechargeTier(data) {
  return apiClient.post('/admin/storedvalue/tiers', data)
}

export function updateRechargeTier(id, data) {
  return apiClient.put(`/admin/storedvalue/tiers/${id}`, data)
}

export function deleteRechargeTier(id) {
  return apiClient.delete(`/admin/storedvalue/tiers/${id}`)
}

// === 等级配置 ===
export function getLevelConfigs(type) {
  return apiClient.get('/admin/storedvalue/level-config', { params: { type } })
}

export function updateLevelConfig(id, data) {
  return apiClient.put(`/admin/storedvalue/level-config/${id}`, data)
}

export function recalculateLevels(levelType) {
  return apiClient.post('/admin/storedvalue/level-config/recalculate', { levelType })
}

// === 流水 ===
export function getTransactions(params) {
  return apiClient.get('/admin/storedvalue/transactions', { params })
}

export function adjustBalance(data) {
  return apiClient.post('/admin/storedvalue/transactions/adjust', data, {
    idempotencyKey: genIdempotencyKey(),
  })
}

// === 充值订单 ===
export function getRechargeOrders(params) {
  return apiClient.get('/admin/storedvalue/recharge-orders', { params })
}
