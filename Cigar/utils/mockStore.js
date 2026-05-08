/**
 * 本地 Mock 数据层（演示模式）
 *
 * 当后端不可用时，提供本地 Storage 支撑完整的演示流程：
 * - 会员余额 / 等级
 * - 购物车（带初始演示商品）
 * - 历史记录（购买 / 海报）
 * - 充值档位
 */

const PROFILE_KEY      = 'demo_profile'
const HISTORY_KEY      = 'demo_history'
const CART_KEY         = 'demo_cart'
const TRANSACTIONS_KEY = 'demo_transactions'

// ─── Mock 雪茄目录（用于风味标签匹配推荐）─────────────────────
const MOCK_CIGAR_CATALOG = [
  { id: 1, name: 'Cohiba Robusto',      tags: ['木质烟草', '雪松丝绸', '咖啡可可'] },
  { id: 2, name: 'Montecristo No.4',    tags: ['奶油丝滑', '香草甜美', '木质烟草'] },
  { id: 3, name: 'Romeo y Julieta No.2',tags: ['果香甜润', '花香清雅', '奶油丝滑'] },
  { id: 4, name: 'Partagas Serie D No.4',tags: ['皮革木桶', '辛香胡椒', '泥土矿物'] },
  { id: 5, name: 'Arturo Fuente Opus X', tags: ['坚果焦糖', '雪松丝绸', '香草甜美'] },
  { id: 6, name: 'Padron 1964 Hermoso', tags: ['咖啡可可', '坚果焦糖', '皮革木桶'] },
  { id: 7, name: 'Davidoff Grand Cru',  tags: ['花香清雅', '奶油丝滑', '果香甜润'] },
  { id: 8, name: 'Oliva Serie V',       tags: ['泥土矿物', '辛香胡椒', '木质烟草'] },
  { id: 9, name: 'Liga Privada No.9',   tags: ['泥炭烟熏', '皮革木桶', '咖啡可可'] },
]

// 风味标签 → 六维评分映射（本地后备）
const TAG_SCORE_MAP = {
  '果香甜润': { 果香: 80, 甜感: 60 },
  '木质烟草': { 木香: 80, 烟草: 70 },
  '泥土矿物': { 土壤: 85, 烟草: 40 },
  '咖啡可可': { 甜感: 50, 木香: 60, 烟草: 55 },
  '辛香胡椒': { 辛辣: 85, 木香: 40 },
  '奶油丝滑': { 甜感: 75, 果香: 45 },
  '皮革木桶': { 木香: 75, 土壤: 60, 烟草: 65 },
  '花香清雅': { 果香: 70, 甜感: 65 },
  '坚果焦糖': { 甜感: 70, 木香: 50 },
  '香草甜美': { 甜感: 90, 果香: 55 },
  '泥炭烟熏': { 土壤: 90, 烟草: 80, 辛辣: 55 },
  '雪松丝绸': { 木香: 90, 果香: 35, 甜感: 40 },
}

const FLAVOR_DIMS = ['果香', '木香', '烟草', '辛辣', '土壤', '甜感']

/** 将标签数组聚合为六维风味向量，各维度封顶 100 */
function _tagsToVector(tags) {
  const vec = { 果香: 0, 木香: 0, 烟草: 0, 辛辣: 0, 土壤: 0, 甜感: 0 }
  tags.forEach(tag => {
    const map = TAG_SCORE_MAP[tag]
    if (!map) return
    Object.keys(map).forEach(k => {
      vec[k] = Math.min(100, vec[k] + map[k])
    })
  })
  return vec
}

/** 计算两个六维向量的余弦相似度 */
function _cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < FLAVOR_DIMS.length; i++) {
    const dim = FLAVOR_DIMS[i]
    dot += vecA[dim] * vecB[dim]
    normA += vecA[dim] * vecA[dim]
    normB += vecB[dim] * vecB[dim]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 根据风味标签匹配最合适的雪茄（余弦相似度）
 * 匹配度为 0 时兜底返回目录第一支雪茄，绝不返回未知雪茄
 */
function matchCigarByTags(tags) {
  if (!tags || tags.length === 0) return MOCK_CIGAR_CATALOG[0]

  const userVec = _tagsToVector(tags)

  let best = MOCK_CIGAR_CATALOG[0]
  let bestScore = -1

  MOCK_CIGAR_CATALOG.forEach(cigar => {
    const cigarVec = _tagsToVector(cigar.tags)
    const score = _cosineSimilarity(userVec, cigarVec)
    if (score > bestScore) {
      bestScore = score
      best = cigar
    }
  })

  return best
}

// ─── 初始化演示数据 ─────────────────────────────────────────

const DEFAULT_PROFILE = {
  userId: 1,
  nickname: '雪茄绅士',
  avatarUrl: '',
  balanceCents: '50000',       // ¥500
  rechargeLevel: 2,
  rechargeLevelName: 'V2',
  rechargePoints: 500,
  consumptionLevel: 1,
  consumptionLevelName: 'V1',
  consumptionPoints: 200,
  orderCount: 3,
  totalRechargeYuan: 500,
  totalSpendYuan: 200,
}

// 演示初始购物车（两支雪茄），清空之前一直存在
const INITIAL_CART = [
  {
    id: 1001,
    productType: 'cigar',
    productId: 1,
    name: 'Cohiba Robusto',
    spec: '单支',
    price: 88,
    qty: 1,
    thumbUrl: '',
    available: true,
    stockAvailable: 10,
  },
  {
    id: 1002,
    productType: 'cigar',
    productId: 2,
    name: 'Montecristo No.4',
    spec: '单支',
    price: 68,
    qty: 1,
    thumbUrl: '',
    available: true,
    stockAvailable: 10,
  },
]

const STATIC_TIERS = [
  { id: 1, amountCents: '50000',  bonusCents: '0',    label: '500元' },
  { id: 2, amountCents: '100000', bonusCents: '5000',  label: '1000元 赠50元' },
  { id: 3, amountCents: '200000', bonusCents: '20000', label: '2000元 赠200元' },
  { id: 4, amountCents: '500000', bonusCents: '80000', label: '5000元 赠800元' },
]

// ─── 会员资料 ──────────────────────────────────────────────

function getProfile() {
  const stored = wx.getStorageSync(PROFILE_KEY)
  if (stored && typeof stored === 'object') return stored
  return JSON.parse(JSON.stringify(DEFAULT_PROFILE))
}

function saveProfile(profile) {
  wx.setStorageSync(PROFILE_KEY, profile)
}

/** 充值后更新余额与等级，同时写入一条交易记录 */
function addRecharge(amountYuan, bonusYuan) {
  const profile = getProfile()
  const addCents = Math.round(((amountYuan || 0) + (bonusYuan || 0)) * 100)
  profile.balanceCents = String(Number(profile.balanceCents || 0) + addCents)
  profile.rechargePoints = (profile.rechargePoints || 0) + (amountYuan || 0)
  profile.totalRechargeYuan = (profile.totalRechargeYuan || 0) + (amountYuan || 0)
  profile.rechargeLevel = _rechargeLevel(profile.totalRechargeYuan)
  profile.rechargeLevelName = 'V' + profile.rechargeLevel
  saveProfile(profile)

  const totalYuan = (amountYuan || 0) + (bonusYuan || 0)
  const balanceAfterYuan = (Number(profile.balanceCents) / 100).toFixed(2)
  const desc = bonusYuan > 0
    ? `充值 ¥${amountYuan}（赠送 ¥${bonusYuan}）`
    : `充值 ¥${amountYuan}`
  _addTransaction({
    type: 'recharge',
    amountYuan: totalYuan.toFixed(2),
    balanceAfterYuan,
    description: desc,
  })
}

// ─── 交易记录 ──────────────────────────────────────────────

function _addTransaction(tx) {
  const list = wx.getStorageSync(TRANSACTIONS_KEY) || []
  list.unshift({
    id: Date.now(),
    type: tx.type,
    amountYuan: tx.amountYuan,
    balanceAfterYuan: tx.balanceAfterYuan,
    description: tx.description || '',
    relatedNo: tx.relatedNo || '',
    createdAt: new Date().toISOString(),
  })
  wx.setStorageSync(TRANSACTIONS_KEY, list)
}

function getTransactions(params) {
  const all = wx.getStorageSync(TRANSACTIONS_KEY) || []
  const type = (params && params.type) || 'all'
  const filtered = type === 'all' ? all : all.filter(tx => tx.type === type)
  const page = (params && params.page) || 1
  const pageSize = (params && params.pageSize) || 20
  const start = (page - 1) * pageSize
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  }
}

/** 结算扣款、累计消费积分 */
function processOrder(items, totalYuan) {
  const profile = getProfile()
  const totalCents = Math.round((totalYuan || 0) * 100)
  profile.balanceCents = String(Math.max(0, Number(profile.balanceCents || 0) - totalCents))
  profile.consumptionPoints = (profile.consumptionPoints || 0) + (totalYuan || 0)
  profile.consumptionLevel = _consumeLevel(profile.consumptionPoints)
  profile.consumptionLevelName = 'V' + profile.consumptionLevel
  profile.orderCount = (profile.orderCount || 0) + 1
  profile.totalSpendYuan = (profile.totalSpendYuan || 0) + (totalYuan || 0)
  saveProfile(profile)

  // 将购买条目写入历史
  const today = new Date().toISOString().slice(0, 10)
  ;(items || []).forEach(item => {
    addHistoryRecord({
      name: item.name || '雪茄',
      origin: '',
      tags: [],
      rating: 5,
      type: 'purchased',
      productId: item.productId,
      cigarId: item.productId,
      date: today,
    })
  })

  // 清空购物车
  wx.setStorageSync(CART_KEY, [])
}

// ─── 历史记录 ──────────────────────────────────────────────

function addHistoryRecord(record) {
  const history = wx.getStorageSync(HISTORY_KEY) || []
  history.unshift({
    id: record.id || (Date.now() + Math.floor(Math.random() * 1000)),
    date: record.date || new Date().toISOString().slice(0, 10),
    createdAt: record.createdAt || new Date().toISOString(),
    name: record.name || '未知雪茄',
    origin: record.origin || '',
    tags: record.tags || [],
    rating: record.rating || 0,
    type: record.type || 'tasted',
    productId: record.productId,
    cigarId: record.cigarId || record.productId || null,
  })
  wx.setStorageSync(HISTORY_KEY, history)
}

function getHistoryRecords() {
  return wx.getStorageSync(HISTORY_KEY) || []
}

// ─── 购物车 ────────────────────────────────────────────────

function getCart() {
  const cart = wx.getStorageSync(CART_KEY)
  if (Array.isArray(cart)) return cart
  // 尚未初始化 → 返回演示用初始商品
  return INITIAL_CART.map(i => ({ ...i }))
}

function addCartItem({ productType, productId, spec, qty, name, price, thumbUrl }) {
  const cart = getCart()
  const existing = cart.find(i => i.productId === productId && i.productType === productType)
  if (existing) {
    existing.qty += (qty || 1)
  } else {
    cart.push({
      id: Date.now(),
      productType,
      productId,
      name: name || '商品',
      spec: spec || '单支',
      price: price || 0,
      qty: qty || 1,
      thumbUrl: thumbUrl || '',
      available: true,
      stockAvailable: 10,
    })
  }
  wx.setStorageSync(CART_KEY, cart)
}

function removeCartItem(cartItemId) {
  const cart = getCart()
  wx.setStorageSync(CART_KEY, cart.filter(i => i.id !== cartItemId))
}

function updateCartItemQty(cartItemId, qty) {
  const cart = getCart()
  const item = cart.find(i => i.id === cartItemId)
  if (item) {
    item.qty = qty
    wx.setStorageSync(CART_KEY, cart)
  }
}

function clearCart() {
  wx.setStorageSync(CART_KEY, [])
}

// ─── 充值档位 ──────────────────────────────────────────────

function getTiers() {
  return STATIC_TIERS
}

// ─── 等级计算 ──────────────────────────────────────────────

function _rechargeLevel(totalYuan) {
  if (totalYuan >= 50000) return 9
  if (totalYuan >= 20000) return 8
  if (totalYuan >= 10000) return 7
  if (totalYuan >= 5000)  return 6
  if (totalYuan >= 2000)  return 5
  if (totalYuan >= 1000)  return 4
  if (totalYuan >= 500)   return 3
  if (totalYuan >= 200)   return 2
  return 1
}

function _consumeLevel(totalYuan) {
  if (totalYuan >= 50000) return 9
  if (totalYuan >= 20000) return 8
  if (totalYuan >= 10000) return 7
  if (totalYuan >= 5000)  return 6
  if (totalYuan >= 2000)  return 5
  if (totalYuan >= 1000)  return 4
  if (totalYuan >= 500)   return 3
  if (totalYuan >= 200)   return 2
  return 1
}

// ─── 推荐问题（后端不可用时的兜底） ────────────────────────────

const MOCK_QUESTIONS = [
  {
    id: 1,
    question: '您平时抽雪茄的频率是？',
    type: 'single',
    options: ['偶尔尝鲜', '每周一次', '每周数次', '每天享用'],
    rawOptions: ['偶尔尝鲜', '每周一次', '每周数次', '每天享用'],
  },
  {
    id: 2,
    question: '您偏好的风味类型是？',
    type: 'multi',
    options: ['果香甜润', '木质烟草', '奶油丝滑', '辛香胡椒', '咖啡可可', '泥土矿物'],
    rawOptions: ['果香甜润', '木质烟草', '奶油丝滑', '辛香胡椒', '咖啡可可', '泥土矿物'],
  },
  {
    id: 3,
    question: '您希望雪茄的烟劲强度是？',
    type: 'single',
    options: ['轻柔顺口', '均衡适中', '醇厚饱满', '劲道十足'],
    rawOptions: ['轻柔顺口', '均衡适中', '醇厚饱满', '劲道十足'],
  },
  {
    id: 4,
    question: '抽雪茄的场合通常是？',
    type: 'single',
    options: ['独自静享', '朋友小聚', '商务场合', '户外休闲'],
    rawOptions: ['独自静享', '朋友小聚', '商务场合', '户外休闲'],
  },
]

function getMockQuestions() {
  return MOCK_QUESTIONS
}

// ─── 导出 ──────────────────────────────────────────────────

module.exports = {
  getProfile,
  saveProfile,
  addRecharge,
  processOrder,
  addHistoryRecord,
  getHistoryRecords,
  getCart,
  addCartItem,
  removeCartItem,
  updateCartItemQty,
  clearCart,
  getTiers,
  matchCigarByTags,
  getMockQuestions,
}
