/**
 * CigarPro API 服务层
 *
 * 封装所有后端接口调用，负责：
 * 1. 请求参数组装
 * 2. 后端响应格式 → 页面期望格式适配
 * 3. 金额分→元转换
 * 4. 后端不可用时自动回退到本地 mockStore（演示模式）
 */

const { get, post, put, del } = require('./request')
const mockStore = require('./mockStore')

// ==================== 工具函数 ====================

/** 分转元 */
function toYuan(cents) {
  if (!cents) return 0
  return Number(cents) / 100
}

/** 字符串分转数字元 */
function centsStrToNum(centsStr) {
  if (!centsStr) return 0
  return Number(centsStr) / 100
}

// ==================== 鉴权 ====================

/**
 * 微信登录
 * @param {string} code - wx.login() 返回的 code
 */
function wechatLogin(code) {
  return post('/auth/wechat-login', { code }, { needAuth: false })
}

/**
 * 刷新 token
 */
function refreshToken(refreshToken) {
  return post('/auth/refresh', { refreshToken }, { needAuth: false })
}

/**
 * 解密手机号
 */
function decryptPhone(encryptedData, iv) {
  return post('/auth/decrypt-phone', { encryptedData, iv })
}

// ==================== 雪茄商品 ====================

/**
 * 获取雪茄列表
 */
function getCigarList(params = {}) {
  return get('/cigars', params, { needAuth: false })
}

/**
 * 获取雪茄详情
 */
function getCigarDetail(id) {
  return get(`/cigars/${id}`, null, { needAuth: false }).then(cigar => {
    if (!cigar) return null
    // 适配成页面期望的格式
    return {
      id: Number(cigar.id),
      name: cigar.name,
      origin: cigar.origin ? `${cigar.origin} · ${cigar.brand || ''}` : cigar.brand || '',
      year: cigar.year || '',
      strength: cigar.strength || '',
      duration: cigar.duration || '',
      price: centsStrToNum(cigar.memberPriceCents || cigar.priceCents),
      priceCents: cigar.memberPriceCents || cigar.priceCents,
      rating: Math.round(Number(cigar.ratingAvg)),
      ratingAvg: cigar.ratingAvg,
      ratingCount: cigar.ratingCount,
      wrapper: cigar.wrapper || '',
      tags: (cigar.tags || []).map(t => t.name),
      scores: cigar.flavorScores || {},
      segments: [
        cigar.flavorStart ? { name: '前段', desc: cigar.flavorStart } : null,
        cigar.flavorMid   ? { name: '中段', desc: cigar.flavorMid   } : null,
        cigar.flavorEnd   ? { name: '尾段', desc: cigar.flavorEnd   } : null,
      ].filter(Boolean),
      pairings: (cigar.pairings || []).map(p => ({
        id: p.id,
        name: p.name,
        categoryCode: p.categoryCode || '',
        price: centsStrToNum(p.memberPriceCents || p.priceCents),
        memberPriceCents: p.memberPriceCents,
        priceCents: p.priceCents,
        thumbUrl: p.thumbUrl || '',
        description: p.description || '',
        stockAvailable: p.stockAvailable ?? 0,
      })),
      related: [], // 二期实现
      heroImageUrl: cigar.heroImageUrl,
      thumbUrl: cigar.thumbUrl,
      stockAvailable: cigar.stockAvailable,
      stock: cigar.stock,
      flavorStart: cigar.flavorStart,
      flavorMid: cigar.flavorMid,
      flavorEnd: cigar.flavorEnd,
      scenes: cigar.scenes || [],
      isNew: cigar.isNew,
    }
  })
}

/** 解析风味段（后端 JSONB → 前端数组） */
function parseSegments(segments) {
  if (!segments) return []
  if (Array.isArray(segments)) return segments
  if (typeof segments === 'object') {
    return [
      segments.flavorStart ? { name: '前段', desc: segments.flavorStart } : null,
      segments.flavorMid ? { name: '中段', desc: segments.flavorMid } : null,
      segments.flavorEnd ? { name: '尾段', desc: segments.flavorEnd } : null,
    ].filter(Boolean)
  }
  return []
}

/**
 * 获取雪茄评价列表
 */
function getCigarReviews(cigarId, params = {}) {
  return get(`/cigars/${cigarId}/reviews`, params).then(res => {
    const pagedData = { list: [], total: 0, page: 1, pageSize: 20 }
    if (!res) return pagedData
    // 后端返回的可能是 { list, total, ... } 或直接是数组
    const list = res.list || res || []
    return {
      list: (Array.isArray(list) ? list : []).map(r => ({
        id: Number(r.id),
        avatar: (r.user?.nickname || '?')[0],
        name: r.user?.nickname || r.nickname || '匿名用户',
        rating: r.rating,
        rechargeLevel: r.userRechargeLevel || 0,
        consumeLevel: r.userConsumptionLevel || 0,
        time: r.createdAt ? r.createdAt.slice(0, 10) : '',
        content: r.content || '',
      })),
      total: res.total || list.length,
      page: res.page || 1,
      pageSize: res.pageSize || 20,
    }
  })
}

// ==================== 购物车 ====================

/**
 * 获取购物车列表
 */
function getCart() {
  return get('/cart', null, { silent: true }).then(res => {
    const data = res || { items: [], totalCents: '0' }
    return {
      items: (data.items || []).map(item => ({
        id: Number(item.id),
        productType: item.productType,
        productId: Number(item.productId),
        name: item.name,
        spec: item.spec,
        price: item.priceYuan != null ? Number(item.priceYuan) : centsStrToNum(item.priceCents),
        qty: item.qty,
        thumbUrl: item.thumbUrl || '',
        available: item.available !== false,
        stockAvailable: item.stockAvailable,
        offline: item.offline,
      })),
      total: centsStrToNum(data.totalCents),
    }
  }).catch(() => {
    const items = mockStore.getCart()
    return {
      items,
      total: items.reduce((s, i) => s + i.price * i.qty, 0),
    }
  })
}

/**
 * 添加商品到购物车
 * _name/_price 为演示模式本地存储用，不发送到后端
 */
function addToCart({ productType, productId, spec, qty = 1, _name, _price, _thumbUrl }) {
  return post('/cart/add', { productType, productId: Number(productId), spec, qty }, { silent: true })
    .catch(() => {
      mockStore.addCartItem({
        productType,
        productId: Number(productId),
        spec,
        qty,
        name: _name,
        price: _price,
        thumbUrl: _thumbUrl,
      })
      return {}
    })
}

/**
 * 修改购物车数量
 */
function updateCartQty(cartItemId, qty) {
  return put(`/cart/${cartItemId}`, { qty }, { silent: true })
    .catch(() => {
      mockStore.updateCartItemQty(cartItemId, qty)
    })
}

/**
 * 删除购物车项
 */
function removeCartItem(cartItemId) {
  return del(`/cart/${cartItemId}`, { silent: true })
    .catch(() => {
      mockStore.removeCartItem(cartItemId)
    })
}

/**
 * 购物车角标数量
 */
function getCartCount() {
  return get('/cart/count', null, { silent: true })
    .then(res => (res ? res.count : 0))
    .catch(() => {
      const cart = mockStore.getCart()
      return cart.reduce((s, i) => s + i.qty, 0)
    })
}

/**
 * 校验购物车
 */
function validateCart() {
  return get('/cart/validate').then(res => ({
    valid: res ? res.valid : false,
    warnings: (res && res.warnings) || [],
  }))
}

// ==================== 订单 ====================

// 暂存 mock 订单数据，用于 payOrder mock fallback
let _pendingMockOrder = null

/**
 * 创建订单
 * @param {string} idempotencyKey - 幂等键
 * @param {Array}  items          - 购物车商品列表
 */
function createOrder(idempotencyKey, items) {
  const body = {
    items: (items || []).map(i => ({
      productType: i.productType,
      productId:   Number(i.productId),
      spec:        i.spec || 'single',
      qty:         Number(i.qty),
    })),
  }
  return post('/orders', body, {
    header: { 'Idempotency-Key': idempotencyKey },
  }).catch(() => {
    const total = (items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)
    _pendingMockOrder = { items: items || [], total }
    return { orderId: Date.now(), id: Date.now() }
  })
}

/**
 * 获取用户订单列表
 */
function getOrderList(params = {}) {
  return get('/orders', { page: params.page || 1, pageSize: params.pageSize || 20, status: params.status || 'all' })
}

/**
 * 获取订单详情
 */
function getOrderDetail(orderId) {
  return get(`/orders/${orderId}`).then(res => {
    if (res && res.order) return res.order
    return res
  })
}

/**
 * 支付订单
 */
function payOrder(orderId, payMethod = 'balance') {
  return post(`/orders/${orderId}/pay`, { payMethod })
    .catch(() => {
      if (_pendingMockOrder) {
        mockStore.processOrder(_pendingMockOrder.items, _pendingMockOrder.total)
        _pendingMockOrder = null
      }
      return { paid: true }
    })
}

/**
 * 取消订单
 */
function cancelOrder(orderId) {
  return post(`/orders/${orderId}/cancel`)
}

// ==================== 会员 ====================

/** 将原始 profile 对象（后端或 mockStore 格式）映射为页面所需格式 */
function _mapProfile(profile) {
  if (!profile) return null
  const balance = centsStrToNum(profile.balanceCents)
  const rechargePoints = Number(profile.rechargePoints || 0)
  const consumptionPoints = Number(profile.consumptionPoints || 0)
  const rechargeLevel = profile.rechargeLevel || 1
  const nextRechargeLevel = rechargeLevel >= 9 ? 9 : rechargeLevel + 1
  const rechargeProgress = Math.min(100, (rechargePoints / (rechargeLevel * 1000)) * 100) || 0
  const consumptionLevel = profile.consumptionLevel || 1
  const nextConsumptionLevel = consumptionLevel >= 9 ? 9 : consumptionLevel + 1
  const consumptionProgress = Math.min(100, (consumptionPoints / (consumptionLevel * 1000)) * 100) || 0
  return {
    userId: profile.userId,
    name: profile.nickname || '雪茄绅士',
    avatarUrl: profile.avatarUrl,
    phoneMask: profile.phoneMask,
    balance,
    balanceCents: profile.balanceCents,
    discount: rechargeLevel >= 6 ? '9.0 折' : '无折扣',
    recharge: {
      level: rechargeLevel,
      levelName: profile.rechargeLevelName || `V${rechargeLevel}`,
      points: rechargePoints,
      nextLevel: nextRechargeLevel,
      remain: Math.max(0, rechargeLevel * 1000 - rechargePoints),
      progress: rechargeProgress,
    },
    consume: {
      level: consumptionLevel,
      levelName: profile.consumptionLevelName || `V${consumptionLevel}`,
      points: consumptionPoints,
      nextLevel: nextConsumptionLevel,
      remain: Math.max(0, consumptionLevel * 1000 - consumptionPoints),
      progress: consumptionProgress,
    },
    rechargeLevel,
    consumptionLevel,
    orderCount: profile.orderCount || 0,
    totalRechargeYuan: profile.totalRechargeYuan,
    totalSpendYuan: profile.totalSpendYuan,
  }
}

/**
 * 获取会员资产
 */
function getMemberProfile() {
  return get('/member/profile', null, { silent: true })
    .then(profile => _mapProfile(profile))
    .catch(() => _mapProfile(mockStore.getProfile()))
}

/**
 * 获取流水明细
 */
function getMemberTransactions(params = {}) {
  return get('/member/transactions', {
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    type: params.type || 'all',
  })
}

// ==================== 充值 ====================

/**
 * 获取充值档位列表
 */
function getRechargeTiers() {
  return get('/storedvalue/tiers', null, { needAuth: false, silent: true })
    .catch(() => mockStore.getTiers())
}

/**
 * 充值下单
 */
function recharge(tierId) {
  return post('/member/recharge', { tierId: Number(tierId) })
}

/**
 * 跳过微信支付，直接触发充值成功（后端 WECHAT_MOCK_MODE=true 时可用）
 * amount_total 必须与充值单 amountCents 一致，后端有严格校验
 * @param {string} rechargeNo  - createRecharge 返回的充值单号
 * @param {number} amountCents - 实付金额（分），不含赠送
 */
function mockPayRecharge(rechargeNo, amountCents) {
  return post('/payment/wechat-callback', {
    out_trade_no: rechargeNo,
    transaction_id: `mock_txn_${rechargeNo}_${Date.now()}`,
    amount_total: Number(amountCents),
    trade_state: 'SUCCESS',
  }, { needAuth: false })
}

/**
 * 获取等级配置
 */
function getLevelConfig(type) {
  return get(`/storedvalue/level-config/${type}`, null, { needAuth: false })
}

// ==================== AI 推荐 ====================

/**
 * 获取推荐问题
 */
function getRecommendQuestions() {
  return get('/recommend/questions', null, { needAuth: false, silent: true }).then(res => {
    if (!res || !res.questions) return mockStore.getMockQuestions()
    return res.questions.map(q => ({
      id: Number(q.id),
      question: q.title,
      type: q.multi ? 'multi' : 'single',
      options: (q.options || []).map((opt, i) =>
        typeof opt === 'string' ? opt : (opt.label || opt.text || `选项${i + 1}`)
      ),
      rawOptions: q.options,
    }))
  }).catch(() => mockStore.getMockQuestions())
}

/**
 * 提交答案获取推荐结果
 */
function getRecommendations(answers) {
  // answers: [{ questionId: number, optionIndex: number }]
  const body = { answers: answers.map(a => ({ questionId: a.questionId, optionIndex: a.optionIndex })), limit: 10 }
  return post('/recommend', body).then(res => {
    if (!res) return []
    const list = res.list || []
    return list.map(item => ({
      id: Number(item.id),
      name: item.name,
      origin: item.brand || '',
      year: '',
      strength: item.strength || '',
      duration: '',
      price: centsStrToNum(item.memberPriceCents || item.priceCents),
      rating: Math.round(Number(item.ratingAvg) || 0),
      tags: (item.matchTags || []),
      scores: (item.scores || {}),
      match: Math.min(100, item.matchPct ?? Math.round((item.score || 0) * 100)),
      thumbUrl: item.thumbUrl,
      flavorStart: item.flavorStart,
      flavorMid: item.flavorMid,
      flavorEnd: item.flavorEnd,
      pairings: (item.pairings || []),
    }))
  })
}

// ==================== 历史记录 ====================

/** 将 ISO 时间戳格式化为 HH:mm */
function _fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 按 createdAt 降序排列，无时间戳的记录排在最后 */
function sortByTimeDesc(records) {
  return records.sort((a, b) => {
    const ta = a.createdAt || ''
    const tb = b.createdAt || ''
    if (ta && tb) return tb.localeCompare(ta)
    if (ta && !tb) return -1
    if (!ta && tb) return 1
    return 0
  })
}

/** 将历史记录列表按日期分组（组间日期降序，组内时间降序） */
function _groupHistory(list) {
  const grouped = {}
  list.forEach(record => {
    const createdAt = record.createdAt || null
    const date = createdAt ? createdAt.slice(0, 10) : ((record.date || '').slice(0, 10) || '未知日期')
    if (!grouped[date]) grouped[date] = []
    grouped[date].push({
      id: Number(record.id),
      name: record.cigarName || record.name || '未知雪茄',
      origin: record.cigarOrigin || record.origin || '',
      tags: record.tags || record.flavorTags || [],
      rating: Math.round(Number(record.cigarRating || record.rating || 0)),
      type: record.source || record.type || 'tasted',
      cigarId: record.cigarId || record.productId || null,
      createdAt,
      time: _fmtTime(createdAt),
    })
  })
  return Object.entries(grouped)
    .map(([date, records]) => ({
      date,
      records: sortByTimeDesc(records),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * 获取历史记录
 * 始终合并本地 mockStore 记录与后端记录，以 id 去重（后端优先），
 * 确保演示模式下海报/购买记录始终可见，无论后端是否在线。
 */
function getHistory(params = {}) {
  const localList = mockStore.getHistoryRecords()
  return get('/history', { page: params.page || 1, pageSize: params.pageSize || 50 }, { silent: true })
    .then(res => {
      const backendList = (res && res.list) ? res.list : (Array.isArray(res) ? res : [])
      const backendIds = new Set(backendList.map(r => String(r.id)))
      const localOnly = localList.filter(r => !backendIds.has(String(r.id)))
      return _groupHistory([...backendList, ...localOnly])
    })
    .catch(() => _groupHistory(localList))
}

/**
 * 记录品鉴（后端失败时写入本地，确保演示模式下可见）
 */
function addTastingRecord(data) {
  return post('/history/tasting', data)
    .catch(() => {
      if (data.cigarId || data.cigarName) {
        mockStore.addHistoryRecord({
          id: Date.now(),
          name: data.cigarName || '未知雪茄',
          origin: data.origin || '',
          tags: data.flavorTags || data.tags || [],
          rating: data.rating || 0,
          type: 'tasted',
          cigarId: data.cigarId || null,
        })
      }
    })
}

// ==================== 评价 ====================

/**
 * 提交评价
 */
function submitReview(data) {
  return post('/reviews', data)
}

// ==================== 风味 ====================

/**
 * 获取风味标签列表
 */
function getFlavorTags() {
  return get('/flavor/tags', null, { needAuth: false }).then(res => {
    if (!res) return []
    return Array.isArray(res) ? res : (res.tags || [])
  })
}

/**
 * 语音风味分析
 */
function analyzeVoice(cigarId, filePath) {
  // 微信小程序语音上传
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${require('./request').BASE_URL}/flavor/analyze-voice`,
      filePath,
      name: 'voice',
      formData: cigarId ? { cigarId: String(cigarId) } : {},
      header: {
        'Authorization': `Bearer ${require('./request').getAccessToken()}`,
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0) resolve(data.data)
          else reject(new Error(data.message))
        } catch {
          reject(new Error('解析响应失败'))
        }
      },
      fail: reject,
    })
  })
}

// ==================== 海报 ====================

/**
 * 创建海报（同时写入本地历史记录，确保演示模式下历史页显示）
 */
function createPoster(data) {
  return post('/posters', data, { silent: true })
    .catch(() => ({ id: Date.now(), _mock: true }))
    .then(result => {
      const tagLabel = (data.flavorTags && data.flavorTags.length > 0)
        ? data.flavorTags.join(' · ')
        : '风味海报'
      mockStore.addHistoryRecord({
        id: result && result.id ? result.id : Date.now(),
        name: data.cigarName || tagLabel,
        origin: '海报生成',
        tags: data.flavorTags || [],
        rating: 0,
        type: 'poster',
        cigarId: data.cigarId || null,
      })
      return result
    })
}

/**
 * 获取海报详情
 */
function getPosterDetail(posterId) {
  return get(`/posters/${posterId}`)
}

// ==================== 店铺信息（公开） ====================

/**
 * 获取店铺公开信息（电话、地址、营业时间）
 */
function getStoreInfo() {
  return get('/admin/settings/public/store-info', null, { needAuth: false, silent: true })
    .then(data => data ? {
      storeName: data.storeName,
      phone: data.storePhone,
      address: data.storeAddress,
      businessHours: data.storeHours,
      logoUrl: data.logoUrl,
    } : null)
}

// ==================== 会员资料更新 ====================

/**
 * 更新会员资料
 * @param {Object} data - { birthday, phone, avatarUrl, ... }
 */
function updateMemberProfile(data) {
  return put('/member/profile', data)
}

// ==================== 配饮 ====================

/**
 * 获取配饮列表
 * @param {Object} params - { category, page, pageSize }
 */
function getPairings(params = {}) {
  return get('/pairings', params, { needAuth: false })
}

/**
 * 获取饮品详情
 */
function getDrinkDetail(id) {
  return get(`/drinks/${id}`, null, { needAuth: false }).then(drink => {
    if (!drink) return null
    return {
      id: drink.id,
      name: drink.name,
      categoryCode: drink.categoryCode || '',
      categoryName: drink.categoryName || '',
      price: Number(drink.memberPriceYuan || drink.priceYuan || 0),
      thumbUrl: drink.thumbUrl || '',
      description: drink.description || '',
      stockAvailable: drink.stockAvailable ?? 0,
    }
  })
}

// ==================== 海报列表/删除 ====================

/**
 * 获取用户海报历史记录（分页）
 */
function getPosterList(params = {}) {
  return get('/posters', { page: params.page || 1, pageSize: params.pageSize || 20 })
}

/**
 * 删除海报记录
 */
function deletePoster(posterId) {
  return del(`/posters/${posterId}`)
}

// ==================== 购物车清空/历史再购 ====================

/**
 * 清空购物车
 */
function clearCart() {
  return post('/cart/clear')
}

/**
 * 基于历史记录再次购买
 * @param {number} historyRecordId - 历史记录 ID
 */
function reorderFromHistory(historyRecordId) {
  return post('/cart/reorder', { historyRecordId: Number(historyRecordId) })
}

// ==================== 订单评价 ====================

/**
 * 提交订单评价
 * @param {number} orderId - 订单 ID
 * @param {Object} data - { rating, content }
 */
function submitOrderReview(orderId, data) {
  return post(`/orders/${orderId}/review`, data)
}

// ==================== 我的评价 ====================

/**
 * 获取我的评价列表（分页）
 */
function getMyReviews(params = {}) {
  return get('/reviews/my', { page: params.page || 1, pageSize: params.pageSize || 20 })
}

// ==================== 历史记录删除 ====================

/**
 * 删除单条历史记录
 */
function deleteHistoryRecord(historyId) {
  return del(`/history/${historyId}`)
}

// ==================== 收藏 ====================

/**
 * 获取收藏列表（分页）
 */
function getFavorites(params = {}) {
  return get('/favorites', { page: params.page || 1, pageSize: params.pageSize || 20 }).then(res => {
    const data = res || { list: [], total: 0 }
    return {
      list: (data.list || []).map(item => ({
        id: Number(item.id),
        productType: item.productType,
        productId: Number(item.productId),
        name: item.name,
        price: centsStrToNum(item.priceCents),
        thumbUrl: item.thumbUrl,
        createdAt: item.createdAt,
      })),
      total: data.total || 0,
      page: data.page || 1,
    }
  })
}

/**
 * 添加收藏
 * @param {Object} data - { productType, productId }
 */
function addFavorite(data) {
  return post('/favorites', {
    productType: data.productType,
    productId: Number(data.productId),
  })
}

/**
 * 取消收藏
 */
function removeFavorite(favoriteId) {
  return del(`/favorites/${favoriteId}`)
}

// ==================== 优惠券 ====================

/**
 * 获取用户可用优惠券列表
 */
function getCoupons() {
  return get('/coupons').then(res => {
    const data = res || { list: [], total: 0 }
    return {
      list: (data.list || []).map(coupon => ({
        id: Number(coupon.id),
        name: coupon.name,
        type: coupon.type,           // discount / cash
        thresholdCents: coupon.thresholdCents,     // 最低消费门槛（分）
        discountRate: coupon.discountRate,           // 折扣率（如 0.9 = 9折），type=discount 时
        discountCents: coupon.discountCents,         // 抵扣金额（分），type=cash 时
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        used: coupon.used || false,
      })),
      total: data.total || 0,
    }
  })
}

// ==================== 横幅/活动/俱乐部信息 ====================

/**
 * 获取首页/会员中心活动横幅列表
 */
function getBanners() {
  return get('/banners', null, { needAuth: false }).then(res =>
    (res && res.list) ? res.list : (Array.isArray(res) ? res : [])
  )
}

/**
 * 获取俱乐部活动列表（分页）
 */
function getActivities(params = {}) {
  return get('/activities', { page: params.page || 1, pageSize: params.pageSize || 20 }, { needAuth: false })
}

/**
 * 获取俱乐部基本信息
 */
function getClubInfo() {
  return get('/club/info', null, { needAuth: false })
}

// ==================== 品鉴预约 ====================

/**
 * 提交品鉴预约
 * @param {Object} data - { date, timeSlot, guests, remark, contactPhone }
 */
function createReservation(data) {
  return post('/reservation', data)
}

/**
 * 获取我的预约列表（分页）
 */
function getReservations(params = {}) {
  return get('/reservation', { page: params.page || 1, pageSize: params.pageSize || 20 })
}

// ==================== 风味匹配推荐 ====================

/**
 * 根据风味标签匹配最合适的雪茄
 * @param {string[]} tags - 风味标签数组
 * @returns {Promise<{id:number, name:string, tags:string[]}>}
 */
function matchCigarByFlavors(tags) {
  return post('/cigars/recommend-by-flavor', { tags }, { silent: true, needAuth: false })
    .then(res => {
      if (res && res.id) return { id: Number(res.id), name: res.name, tags: res.tags || [] }
      return mockStore.matchCigarByTags(tags)
    })
    .catch(() => mockStore.matchCigarByTags(tags))
}

// ==================== DeepSeek AI 分析 ====================

const DEEPSEEK_API_KEY = 'YOUR_DEEPSEEK_API_KEY' // 替换为实际的 DeepSeek API Key

/**
 * 使用 DeepSeek 大模型分析雪茄风味描述，提取风味关键词和品鉴总结
 * @param {string} text - 用户输入的品鉴描述文字
 */
function analyzeFlavorWithDeepSeek(text) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://api.deepseek.com/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      data: {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业雪茄品鉴师，擅长从品鉴描述中提取风味关键词。请始终以JSON格式回复，不要包含任何额外文字。',
          },
          {
            role: 'user',
            content: `从以下雪茄品鉴描述中提取3个最具代表性的风味关键词（用中文，如木质、烟草、咖啡、可可、奶油、皮革、香草、胡椒、泥土、花香等），并给出一句不超过40字的品鉴总结。\n\n以JSON格式返回：{"flavors":["关键词1","关键词2","关键词3"],"summary":"一句话总结"}\n\n品鉴描述：${text}`,
          },
        ],
        max_tokens: 200,
        response_format: { type: 'json_object' },
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices[0]) {
          try {
            const content = res.data.choices[0].message.content
            const parsed = JSON.parse(content)
            resolve({
              flavors: parsed.flavors || ['木质烟草', '咖啡可可', '奶油丝滑'],
              transcript: parsed.summary || text,
            })
          } catch {
            resolve({ flavors: ['木质烟草', '咖啡可可', '奶油丝滑'], transcript: text })
          }
        } else {
          reject(new Error('DeepSeek API 调用失败'))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

// ==================== 导出 ====================

module.exports = {
  // 鉴权
  wechatLogin,
  refreshToken,
  decryptPhone,

  // 商品
  getCigarList,
  getCigarDetail,
  getCigarReviews,

  // 购物车
  getCart,
  addToCart,
  updateCartQty,
  removeCartItem,
  getCartCount,
  validateCart,
  clearCart,
  reorderFromHistory,

  // 订单
  createOrder,
  getOrderList,
  getOrderDetail,
  payOrder,
  cancelOrder,
  submitOrderReview,

  // 会员
  getMemberProfile,
  getMemberTransactions,
  updateMemberProfile,

  // 充值
  getRechargeTiers,
  recharge,
  mockPayRecharge,
  getLevelConfig,

  // AI 推荐
  getRecommendQuestions,
  getRecommendations,

  // 历史记录
  getHistory,
  addTastingRecord,
  deleteHistoryRecord,
  sortByTimeDesc,

  // 评价
  submitReview,
  getMyReviews,

  // 风味
  getFlavorTags,
  analyzeVoice,
  matchCigarByFlavors,

  // 海报
  createPoster,
  getPosterDetail,
  getPosterList,
  deletePoster,

  // 配饮
  getPairings,
  getDrinkDetail,

  // 收藏
  getFavorites,
  addFavorite,
  removeFavorite,

  // 优惠券
  getCoupons,

  // 横幅 / 活动 / 俱乐部
  getBanners,
  getActivities,
  getClubInfo,

  // 预约
  createReservation,
  getReservations,

  // 店铺
  getStoreInfo,

  // DeepSeek AI 分析
  analyzeFlavorWithDeepSeek,
}
