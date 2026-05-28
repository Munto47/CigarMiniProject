/**
 * API 接口契约测试
 *
 * 为文档中定义的每一个用户端 API 接口编写契约验证。
 * 确保：
 * 1. 已实现的接口调用正确的 HTTP 方法、路径、参数格式
 * 2. 数据的请求/响应格式与文档一致
 * 3. 未实现的接口在 api.js 中有明确的占位定义
 *
 * 本文件按文档第六章的模块划分组织。
 */

require('../setup')

// Mock request.js
const mockGetters = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}

jest.mock('../../utils/request', () => {
  const _storage = {}
  return {
    BASE_URL: 'http://localhost:3000/api',
    get: mockGetters.get,
    post: mockGetters.post,
    put: mockGetters.put,
    del: mockGetters.del,
    getAccessToken: jest.fn(() => _storage.accessToken || ''),
    saveTokens: jest.fn(),
    clearTokens: jest.fn(),
    saveUserInfo: jest.fn(),
    getUserInfo: jest.fn(),
    isLoggedIn: jest.fn(() => true),
    __mockGetters: mockGetters,
  }
})

const api = require('../../utils/api')
const { __mockGetters } = require('../../utils/request')

function mock(fn) { return __mockGetters[fn] }

beforeEach(() => {
  jest.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════
// 6.1 认证模块
// ═══════════════════════════════════════════════════════════
describe('6.1 Auth — 认证模块', () => {
  describe('POST /auth/wechat-login', () => {
    it('应使用正确的请求路径和方法', async () => {
      mock('post').mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', userInfo: {} })
      await api.wechatLogin('wx-code-123')
      expect(mock('post')).toHaveBeenCalledWith(
        '/auth/wechat-login',
        { code: 'wx-code-123' },
        { needAuth: false }
      )
    })

    it('服务端返回完整数据时应包含 userInfo', async () => {
      const resp = { accessToken: 'at', refreshToken: 'rt', userInfo: { nickname: '张三', avatarUrl: '/a.jpg' } }
      mock('post').mockResolvedValue(resp)
      const result = await api.wechatLogin('code')
      expect(result).toEqual(resp)
    })
  })

  describe('POST /auth/refresh', () => {
    it('应使用正确的请求路径和参数', async () => {
      mock('post').mockResolvedValue({ accessToken: 'new-at' })
      await api.refreshToken('rt-old')
      expect(mock('post')).toHaveBeenCalledWith(
        '/auth/refresh',
        { refreshToken: 'rt-old' },
        { needAuth: false }
      )
    })
  })

  describe('POST /auth/decrypt-phone', () => {
    it('应使用正确的请求路径和参数', async () => {
      mock('post').mockResolvedValue({ phone: '13800138000' })
      await api.decryptPhone('enc-data', 'iv-str')
      expect(mock('post')).toHaveBeenCalledWith(
        '/auth/decrypt-phone',
        { encryptedData: 'enc-data', iv: 'iv-str' }
      )
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.2 会员模块
// ═══════════════════════════════════════════════════════════
describe('6.2 Member — 会员模块', () => {
  describe('GET /member/profile', () => {
    it('应正确调用并返回格式化的会员数据', async () => {
      mock('get').mockResolvedValue({
        userId: 1, nickname: 'VIP', avatarUrl: '/a.jpg',
        balanceCents: '500000', rechargeLevel: 3, consumptionLevel: 2,
        rechargePoints: 2500, consumptionPoints: 1500,
      })
      const result = await api.getMemberProfile()
      expect(mock('get')).toHaveBeenCalledWith('/member/profile', null, { silent: true })
      expect(result).toMatchObject({
        balance: 5000,
        recharge: expect.objectContaining({ level: 3 }),
        consume: expect.objectContaining({ level: 2 }),
      })
    })

    it('等级为 9 时 nextLevel 不应超过 9', async () => {
      mock('get').mockResolvedValue({
        userId: 1, nickname: 'V9', balanceCents: '0',
        rechargeLevel: 9, consumptionLevel: 9,
        rechargePoints: 9000, consumptionPoints: 9000,
      })
      const result = await api.getMemberProfile()
      expect(result.recharge.nextLevel).toBe(9)
      expect(result.consume.nextLevel).toBe(9)
    })

    it('rechargeLevel >= 6 时 discount 为 9.0 折', async () => {
      mock('get').mockResolvedValue({
        userId: 1, nickname: 'VIP6', balanceCents: '0',
        rechargeLevel: 6, consumptionLevel: 1,
        rechargePoints: 6000, consumptionPoints: 0,
      })
      const result = await api.getMemberProfile()
      expect(result.discount).toBe('9.0 折')
    })

    it('rechargeLevel < 6 时 discount 为 无折扣', async () => {
      mock('get').mockResolvedValue({
        userId: 1, nickname: '普通', balanceCents: '0',
        rechargeLevel: 3, consumptionLevel: 2,
        rechargePoints: 3000, consumptionPoints: 2000,
      })
      const result = await api.getMemberProfile()
      expect(result.discount).toBe('无折扣')
    })
  })

  describe('GET /member/transactions', () => {
    it('默认参数应为 page=1, pageSize=20, type=all', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getMemberTransactions()
      expect(mock('get')).toHaveBeenCalledWith('/member/transactions', {
        page: 1, pageSize: 20, type: 'all',
      })
    })

    it('支持分页和类型筛选', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getMemberTransactions({ page: 2, pageSize: 10, type: 'recharge' })
      expect(mock('get')).toHaveBeenCalledWith('/member/transactions', {
        page: 2, pageSize: 10, type: 'recharge',
      })
    })
  })

  describe('GET /storedvalue/tiers', () => {
    it('应调用正确路径（无需鉴权）', async () => {
      mock('get').mockResolvedValue([{ id: 1, amountCents: '10000' }])
      await api.getRechargeTiers()
      expect(mock('get')).toHaveBeenCalledWith('/storedvalue/tiers', null, { needAuth: false, silent: true })
    })
  })

  describe('POST /member/recharge', () => {
    it('应发送 tierId 并返回支付参数', async () => {
      mock('post').mockResolvedValue({ orderId: 10, payParams: { timeStamp: '123' } })
      const result = await api.recharge(5)
      expect(mock('post')).toHaveBeenCalledWith('/member/recharge', { tierId: 5 })
      expect(result).toHaveProperty('payParams')
    })
  })

  describe('GET /storedvalue/level-config/:type', () => {
    it('应支持 recharge 类型', async () => {
      mock('get').mockResolvedValue([{ level: 1, minPoints: 0 }])
      await api.getLevelConfig('recharge')
      expect(mock('get')).toHaveBeenCalledWith('/storedvalue/level-config/recharge', null, { needAuth: false })
    })

    it('应支持 consume 类型', async () => {
      mock('get').mockResolvedValue([])
      await api.getLevelConfig('consume')
      expect(mock('get')).toHaveBeenCalledWith('/storedvalue/level-config/consume', null, { needAuth: false })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.3 雪茄商品模块
// ═══════════════════════════════════════════════════════════
describe('6.3 Cigars — 雪茄商品模块', () => {
  describe('GET /cigars', () => {
    it('应支持分页参数', async () => {
      mock('get').mockResolvedValue([{ id: 1 }])
      await api.getCigarList({ page: 1, pageSize: 10 })
      expect(mock('get')).toHaveBeenCalledWith('/cigars', { page: 1, pageSize: 10 }, { needAuth: false })
    })

    it('无需鉴权即可访问', async () => {
      mock('get').mockResolvedValue([])
      await api.getCigarList()
      expect(mock('get')).toHaveBeenCalledWith('/cigars', {}, { needAuth: false })
    })
  })

  describe('GET /cigars/:id', () => {
      beforeEach(() => {
        global.wx = global.wx || {}
        global.wx.request = jest.fn()
      })

      it('应将分（cents）转为元（yuan）', async () => {
        mock('get').mockResolvedValue({
          id: 1, name: '雪茄', priceCents: 1500
        })
        const result = await api.getCigarDetail(1)
        expect(result.price).toBe(15)
      })

      it('获取成功应从 flavorStart/Mid/End 提取为 segments 数组', async () => {
        const mockRequest = require('../../utils/request').get
        mockRequest.mockResolvedValue({
          id: 1,
          name: '雪茄',
          flavorStart: '清淡',
          flavorMid: '浓郁',
          flavorEnd: '回甘'
        })
        const result = await api.getCigarDetail(1)
        expect(result.segments).toEqual([
          { name: '前段', desc: '清淡' },
          { name: '中段', desc: '浓郁' },
          { name: '尾段', desc: '回甘' },
        ])
      })

      it('缺少某个阶段时，segments 中不包含该阶段', async () => {
        const mockRequest = require('../../utils/request').get
        mockRequest.mockResolvedValue({
          id: 1,
          name: '雪茄',
          flavorStart: '清淡',
          flavorEnd: '回甘'
        })
        const result = await api.getCigarDetail(1)
        expect(result.segments).toEqual([
          { name: '前段', desc: '清淡' },
          { name: '尾段', desc: '回甘' },
        ])
      })

      it('都没有时，segments 为空数组', async () => {
        const mockRequest = require('../../utils/request').get
        mockRequest.mockResolvedValue({
          id: 1,
          name: '雪茄',
        })
        const result = await api.getCigarDetail(1)
        expect(result.segments).toEqual([])
      })

    it('不存在的雪茄应返回 null', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getCigarDetail(999)
      expect(result).toBeNull()
    })
  })

  describe('GET /cigars/:id/reviews', () => {
    it('应格式化为包含 avatar/name/rating/time 的列表', async () => {
      mock('get').mockResolvedValue({
        list: [{
          id: '1', user: { nickname: '张三' }, rating: 5,
          content: '好评', createdAt: '2026-05-01',
          userRechargeLevel: 3, userConsumptionLevel: 2,
        }],
        total: 1, page: 1, pageSize: 20,
      })
      const result = await api.getCigarReviews(1, { page: 1, pageSize: 10 })
      expect(mock('get')).toHaveBeenCalledWith('/cigars/1/reviews', { page: 1, pageSize: 10 })
      expect(result.list[0]).toMatchObject({
        id: 1, avatar: '张', name: '张三', rating: 5,
        rechargeLevel: 3, consumeLevel: 2, time: '2026-05-01',
      })
    })

    it('服务端返回纯数组时也应包装为分页格式', async () => {
      mock('get').mockResolvedValue([{ id: '1', rating: 3 }])
      const result = await api.getCigarReviews(1)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('空响应应返回默认分页结构', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getCigarReviews(1)
      expect(result.list).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.4 AI 推荐模块
// ═══════════════════════════════════════════════════════════
describe('6.4 Recommend — AI 推荐模块', () => {
  describe('GET /recommend/questions', () => {
    it('应格式化为 id/question/type/options 结构', async () => {
      mock('get').mockResolvedValue({
        questions: [
          { id: '1', title: '偏好', multi: false, options: ['A', 'B'] },
          { id: '2', title: '风味', multi: true, options: [{ label: '清淡' }, { label: '浓郁' }] },
        ],
      })
      const result = await api.getRecommendQuestions()
      expect(result[0]).toMatchObject({ id: 1, type: 'single', options: ['A', 'B'] })
      expect(result[1]).toMatchObject({ id: 2, type: 'multi', options: ['清淡', '浓郁'] })
    })

    it('问题为空时应返回空数组', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getRecommendQuestions()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('POST /recommend', () => {
    it('应将 answers 和 limit 放入请求体', async () => {
      mock('post').mockResolvedValue({ list: [] })
      const answers = [{ questionId: 1, optionIndex: 0 }, { questionId: 2, optionIndex: 1 }]
      await api.getRecommendations(answers)
      expect(mock('post')).toHaveBeenCalledWith('/recommend', { answers, limit: 10 })
    })

    it('应计算 match 百分比（score * 100）', async () => {
      mock('post').mockResolvedValue({
        list: [{ id: '10', name: '推荐', score: 0.85, memberPriceCents: '20000', ratingAvg: '4.5' }],
      })
      const result = await api.getRecommendations([{ questionId: 1, optionIndex: 0 }])
      expect(result[0].match).toBe(85)
      expect(result[0].price).toBe(200)
    })

    it('空响应应返回空数组', async () => {
      mock('post').mockResolvedValue(null)
      const result = await api.getRecommendations([{ questionId: 1, optionIndex: 0 }])
      expect(result).toEqual([])
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.5 风味/海报模块
// ═══════════════════════════════════════════════════════════
describe('6.5 Flavor & Posters — 风味/海报模块', () => {
  describe('GET /flavor/tags', () => {
    it('应获取标签列表（无需鉴权）', async () => {
      mock('get').mockResolvedValue([{ id: 1, name: '木质烟草', scoreMap: { 木香: 80 } }])
      await api.getFlavorTags()
      expect(mock('get')).toHaveBeenCalledWith('/flavor/tags', null, { needAuth: false })
    })
  })

  describe('POST /flavor/analyze-voice', () => {
    beforeEach(() => {
      global.wx = global.wx || {}
      global.wx.request = jest.fn()
    })

    it('应发送包含音频数据的 POST 请求', async () => {
      mock('post').mockResolvedValue({ id: 1 })
      await api.analyzeVoice({ cigarId: 1, audioBase64: 'mock_base64', audioFormat: 'mp3' })
      expect(mock('post')).toHaveBeenCalledWith(
        '/flavor/analyze-voice',
        expect.objectContaining({
          audioBase64: 'mock_base64',
          audioFormat: 'mp3',
          cigarId: 1,
          text: undefined
        })
      )
    })

    it('无 cigarId 时 data 中不包含', async () => {
      mock('post').mockResolvedValue({ id: 1 })
      await api.analyzeVoice({ audioBase64: 'mock_base64' })
      expect(mock('post')).toHaveBeenCalledWith(
        '/flavor/analyze-voice',
        expect.objectContaining({
          cigarId: undefined
        })
      )
    })

    it('code != 0 时应 reject', async () => {
      mock('post').mockRejectedValue(new Error('分析失败'))
      await expect(api.analyzeVoice({ cigarId: 1, audioBase64: 'mock_base64' })).rejects.toThrow('分析失败')
    })
  })

  describe('POST /posters', () => {
    it('应保存海报记录', async () => {
      mock('post').mockResolvedValue({ id: 100 })
      await api.createPoster({ flavors: ['木质'], transcript: '测试' })
      expect(mock('post')).toHaveBeenCalledWith('/posters', { flavors: ['木质'], transcript: '测试' }, { silent: true })
    })
  })

  describe('GET /posters/:id', () => {
    it('应获取海报详情', async () => {
      mock('get').mockResolvedValue({ id: 100, flavors: ['木质'] })
      const result = await api.getPosterDetail(100)
      expect(mock('get')).toHaveBeenCalledWith('/posters/100')
      expect(result.id).toBe(100)
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.6 购物车模块
// ═══════════════════════════════════════════════════════════
describe('6.6 Cart — 购物车模块', () => {
  describe('GET /cart', () => {
    it('应将价格分→元并保留原始字段', async () => {
      mock('get').mockResolvedValue({
        items: [{ id: '1', priceCents: '35800', qty: 2, name: '雪茄', available: true }],
        totalCents: '71600',
      })
      const result = await api.getCart()
      expect(result.items[0].price).toBe(358)
      expect(result.items[0].id).toBe(1)
      expect(result.total).toBe(716)
    })

    it('空购物车应返回空数组和 0 总额', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getCart()
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('GET /cart/count', () => {
    it('应返回商品数量', async () => {
      mock('get').mockResolvedValue({ count: 5 })
      const result = await api.getCartCount()
      expect(mock('get')).toHaveBeenCalledWith('/cart/count', null, { silent: true })
      expect(result).toBe(5)
    })

    it('空响应应返回 0', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getCartCount()
      expect(result).toBe(0)
    })
  })

  describe('POST /cart/add', () => {
    it('应发送 productType/productId/spec/qty', async () => {
      mock('post').mockResolvedValue({})
      await api.addToCart({ productType: 'cigar', productId: 10, spec: '单支', qty: 2 })
      expect(mock('post')).toHaveBeenCalledWith('/cart/add', {
        productType: 'cigar', productId: 10, spec: '单支', qty: 2,
      }, { silent: true })
    })

    it('默认 qty 应为 1', async () => {
      mock('post').mockResolvedValue({})
      await api.addToCart({ productType: 'cigar', productId: 5, spec: '单支' })
      expect(mock('post')).toHaveBeenCalledWith('/cart/add', {
        productType: 'cigar', productId: 5, spec: '单支', qty: 1,
      }, { silent: true })
    })
  })

  describe('PUT /cart/:id', () => {
    it('应发送 qty 更新', async () => {
      mock('put').mockResolvedValue({})
      await api.updateCartQty(5, 3)
      expect(mock('put')).toHaveBeenCalledWith('/cart/5', { qty: 3 }, { silent: true })
    })
  })

  describe('DELETE /cart/:id', () => {
    it('应删除指定购物车项', async () => {
      mock('del').mockResolvedValue({})
      await api.removeCartItem(5)
      expect(mock('del')).toHaveBeenCalledWith('/cart/5', { silent: true })
    })
  })

  describe('GET /cart/validate', () => {
    it('校验通过应返回 valid=true', async () => {
      mock('get').mockResolvedValue({ valid: true, warnings: [] })
      const result = await api.validateCart()
      expect(result.valid).toBe(true)
      expect(result.warnings).toEqual([])
    })

    it('校验失败应返回 valid=false 和警告', async () => {
      mock('get').mockResolvedValue({ valid: false, warnings: [{ item: '库存不足' }] })
      const result = await api.validateCart()
      expect(result.valid).toBe(false)
      expect(result.warnings).toHaveLength(1)
    })

    it('空响应应返回 valid=false', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.validateCart()
      expect(result.valid).toBe(false)
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.7 订单模块
// ═══════════════════════════════════════════════════════════
describe('6.7 Orders — 订单模块', () => {
  describe('POST /orders', () => {
    it('应携带 Idempotency-Key header', async () => {
      mock('post').mockResolvedValue({ orderId: 1 })
      await api.createOrder('uuid-123')
      expect(mock('post')).toHaveBeenCalledWith(
        '/orders', { items: [] },
        { header: { 'Idempotency-Key': 'uuid-123' } }
      )
    })
  })

  describe('GET /orders', () => {
    it('应支持按状态筛选和分页', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getOrderList({ page: 1, pageSize: 10, status: 'pending' })
      expect(mock('get')).toHaveBeenCalledWith('/orders', { page: 1, pageSize: 10, status: 'pending' })
    })

    it('默认参数应合理', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getOrderList()
      expect(mock('get')).toHaveBeenCalledWith('/orders', { page: 1, pageSize: 20, status: 'all' })
    })
  })

  describe('GET /orders/:id', () => {
    it('应获取订单详情', async () => {
      mock('get').mockResolvedValue({ id: 5, status: 'pending' })
      const result = await api.getOrderDetail(5)
      expect(mock('get')).toHaveBeenCalledWith('/orders/5')
      expect(result.id).toBe(5)
    })

    it('返回含 order 字段时应解包', async () => {
      mock('get').mockResolvedValue({ order: { id: 10, status: 'paid' } })
      const result = await api.getOrderDetail(10)
      expect(result.id).toBe(10)
      expect(result.status).toBe('paid')
    })
  })

  describe('POST /orders/:id/pay', () => {
    it('余额支付应发送 payMethod=balance', async () => {
      mock('post').mockResolvedValue({ paid: true })
      await api.payOrder(1, 'balance')
      expect(mock('post')).toHaveBeenCalledWith('/orders/1/pay', { payMethod: 'balance' })
    })

    it('美团支付应发送 payMethod=meituan', async () => {
      mock('post').mockResolvedValue({ redirectUrl: 'https://...' })
      await api.payOrder(1, 'meituan')
      expect(mock('post')).toHaveBeenCalledWith('/orders/1/pay', { payMethod: 'meituan' })
    })
  })

  describe('POST /orders/:id/cancel', () => {
    it('应取消订单', async () => {
      mock('post').mockResolvedValue({})
      await api.cancelOrder(1)
      expect(mock('post')).toHaveBeenCalledWith('/orders/1/cancel')
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.8 评价模块
// ═══════════════════════════════════════════════════════════
describe('6.8 Reviews — 评价模块', () => {
  describe('POST /reviews', () => {
    it('应提交评价（含 cigarId/rating/content）', async () => {
      mock('post').mockResolvedValue({ id: 1 })
      await api.submitReview({ cigarId: 1, rating: 5, content: '非常好' })
      expect(mock('post')).toHaveBeenCalledWith('/reviews', {
        cigarId: 1, rating: 5, content: '非常好',
      })
    })

    it('应支持可选 orderId', async () => {
      mock('post').mockResolvedValue({ id: 1 })
      await api.submitReview({ cigarId: 1, orderId: 100, rating: 4, content: '不错' })
      expect(mock('post')).toHaveBeenCalledWith('/reviews', {
        cigarId: 1, orderId: 100, rating: 4, content: '不错',
      })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.9 历史记录模块
// ═══════════════════════════════════════════════════════════
describe('6.9 History — 历史记录模块', () => {
  describe('GET /history', () => {
    it('应按日期分组并降序排列', async () => {
      mock('get').mockResolvedValue({
        list: [
          { id: '1', cigarName: 'A', createdAt: '2026-05-03', source: 'tasted' },
          { id: '2', cigarName: 'B', createdAt: '2026-05-03', source: 'purchased' },
          { id: '3', cigarName: 'C', createdAt: '2026-05-01', source: 'poster' },
        ],
      })
      const result = await api.getHistory()
      expect(result[0].date).toBe('2026-05-03')
      expect(result[0].records).toHaveLength(2)
      expect(result[1].date).toBe('2026-05-01')
      expect(result[1].records).toHaveLength(1)
    })

    it('无 createdAt 时标记为 未知日期', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', cigarName: 'Test' }] })
      const result = await api.getHistory()
      expect(result[0].date).toBe('未知日期')
    })

    it('记录名称为空时回退到兜底值', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', createdAt: '2026-01-01' }] })
      const result = await api.getHistory()
      expect(result[0].records[0].name).toBe('未知雪茄')
    })
  })

  describe('POST /history/tasting', () => {
    it('应保存品鉴记录', async () => {
      mock('post').mockResolvedValue({})
      await api.addTastingRecord({ flavorScores: { 果香: 60 }, type: 'tasted' })
      expect(mock('post')).toHaveBeenCalledWith('/history/tasting', {
        flavorScores: { 果香: 60 }, type: 'tasted',
      })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.12 店铺信息模块
// ═══════════════════════════════════════════════════════════
describe('6.12 Store — 店铺信息模块', () => {
  describe('GET /admin/settings/public/store-info', () => {
    it('应获取店铺公开信息（无需鉴权）', async () => {
      mock('get').mockResolvedValue({ phone: '138', address: '地址', storeName: 'GOAT' })
      await api.getStoreInfo()
      expect(mock('get')).toHaveBeenCalledWith(
        '/admin/settings/public/store-info', null, { needAuth: false, silent: true }
      )
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.2b 会员资料更新
// ═══════════════════════════════════════════════════════════
describe('6.2b Member — 会员资料更新', () => {
  describe('PUT /member/profile', () => {
    it('应更新会员资料', async () => {
      mock('put').mockResolvedValue({ updated: true })
      await api.updateMemberProfile({ birthday: '1990-01-01', phone: '13800138000' })
      expect(mock('put')).toHaveBeenCalledWith('/member/profile', {
        birthday: '1990-01-01', phone: '13800138000',
      })
    })

    it('应支持部分更新（单字段）', async () => {
      mock('put').mockResolvedValue({ updated: true })
      await api.updateMemberProfile({ avatarUrl: '/new-avatar.jpg' })
      expect(mock('put')).toHaveBeenCalledWith('/member/profile', {
        avatarUrl: '/new-avatar.jpg',
      })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.3b 配饮模块
// ═══════════════════════════════════════════════════════════
describe('6.3b Pairings — 配饮模块', () => {
  describe('GET /pairings', () => {
    it('应获取配饮列表（无需鉴权）', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', name: '格兰菲迪 18 年', type: '威士忌' }], total: 1 })
      await api.getPairings({ category: 'whisky' })
      expect(mock('get')).toHaveBeenCalledWith('/pairings', { category: 'whisky' }, { needAuth: false })
    })

    it('不传参数时应获取全部配饮', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getPairings()
      expect(mock('get')).toHaveBeenCalledWith('/pairings', {}, { needAuth: false })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.5b 海报列表/删除
// ═══════════════════════════════════════════════════════════
describe('6.5b Posters — 海报列表与删除', () => {
  describe('GET /posters (list)', () => {
    it('应分页获取用户海报历史', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', flavors: ['木质'] }], total: 1 })
      await api.getPosterList({ page: 1, pageSize: 10 })
      expect(mock('get')).toHaveBeenCalledWith('/posters', { page: 1, pageSize: 10 })
    })

    it('默认分页参数为标准值', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getPosterList()
      expect(mock('get')).toHaveBeenCalledWith('/posters', { page: 1, pageSize: 20 })
    })
  })

  describe('DELETE /posters/:id', () => {
    it('应删除指定海报', async () => {
      mock('del').mockResolvedValue({ deleted: true })
      await api.deletePoster(100)
      expect(mock('del')).toHaveBeenCalledWith('/posters/100')
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.6b 购物车扩展（清空/历史再购）
// ═══════════════════════════════════════════════════════════
describe('6.6b Cart — 购物车扩展', () => {
  describe('POST /cart/clear', () => {
    it('应清空购物车', async () => {
      mock('post').mockResolvedValue({ cleared: true })
      await api.clearCart()
      expect(mock('post')).toHaveBeenCalledWith('/cart/clear')
    })
  })

  describe('POST /cart/reorder', () => {
    it('应基于历史记录再次购买', async () => {
      mock('post').mockResolvedValue({ added: true })
      await api.reorderFromHistory(42)
      expect(mock('post')).toHaveBeenCalledWith('/cart/reorder', { historyRecordId: 42 })
    })

    it('historyRecordId 应为数字类型', async () => {
      mock('post').mockResolvedValue({ added: true })
      await api.reorderFromHistory('42')
      expect(mock('post')).toHaveBeenCalledWith('/cart/reorder', { historyRecordId: 42 })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.7b 订单评价
// ═══════════════════════════════════════════════════════════
describe('6.7b Orders — 订单评价', () => {
  describe('POST /orders/:id/review', () => {
    it('应提交订单评价', async () => {
      mock('post').mockResolvedValue({ reviewId: 1 })
      await api.submitOrderReview(100, { rating: 5, content: '很满意' })
      expect(mock('post')).toHaveBeenCalledWith('/orders/100/review', { rating: 5, content: '很满意' })
    })

    it('应支持可选图片字段', async () => {
      mock('post').mockResolvedValue({ reviewId: 2 })
      await api.submitOrderReview(100, { rating: 4, content: '不错', images: ['/img1.jpg'] })
      expect(mock('post')).toHaveBeenCalledWith('/orders/100/review', {
        rating: 4, content: '不错', images: ['/img1.jpg'],
      })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.8b 我的评价列表
// ═══════════════════════════════════════════════════════════
describe('6.8b Reviews — 我的评价', () => {
  describe('GET /reviews/my', () => {
    it('应获取我的评价列表并分页', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', rating: 5, content: '好' }], total: 1 })
      await api.getMyReviews({ page: 1, pageSize: 10 })
      expect(mock('get')).toHaveBeenCalledWith('/reviews/my', { page: 1, pageSize: 10 })
    })

    it('默认分页参数应合理', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getMyReviews()
      expect(mock('get')).toHaveBeenCalledWith('/reviews/my', { page: 1, pageSize: 20 })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.9b 历史记录删除
// ═══════════════════════════════════════════════════════════
describe('6.9b History — 历史记录删除', () => {
  describe('DELETE /history/:id', () => {
    it('应删除指定历史记录', async () => {
      mock('del').mockResolvedValue({ deleted: true })
      await api.deleteHistoryRecord(55)
      expect(mock('del')).toHaveBeenCalledWith('/history/55')
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.10 收藏模块
// ═══════════════════════════════════════════════════════════
describe('6.10 Favorites — 收藏模块', () => {
  describe('GET /favorites', () => {
    it('应获取收藏列表并转换价格', async () => {
      mock('get').mockResolvedValue({
        list: [
          { id: '1', productType: 'cigar', productId: '10', name: '雪茄A', priceCents: '35800', thumbUrl: '/a.jpg', createdAt: '2026-05-01' },
          { id: '2', productType: 'cigar', productId: '20', name: '雪茄B', priceCents: '20000', thumbUrl: '/b.jpg', createdAt: '2026-05-03' },
        ],
        total: 2, page: 1,
      })
      const result = await api.getFavorites({ page: 1, pageSize: 20 })
      expect(mock('get')).toHaveBeenCalledWith('/favorites', { page: 1, pageSize: 20 })
      expect(result.list).toHaveLength(2)
      expect(result.list[0].id).toBe(1)
      expect(result.list[0].price).toBe(358)
      expect(result.total).toBe(2)
    })

    it('空响应应返回默认结构', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getFavorites()
      expect(result.list).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('POST /favorites', () => {
    it('应添加收藏', async () => {
      mock('post').mockResolvedValue({ id: 1 })
      await api.addFavorite({ productType: 'cigar', productId: 10 })
      expect(mock('post')).toHaveBeenCalledWith('/favorites', {
        productType: 'cigar', productId: 10,
      })
    })

    it('productId 应转为数字', async () => {
      mock('post').mockResolvedValue({ id: 2 })
      await api.addFavorite({ productType: 'drink', productId: '30' })
      expect(mock('post')).toHaveBeenCalledWith('/favorites', {
        productType: 'drink', productId: 30,
      })
    })
  })

  describe('DELETE /favorites/:id', () => {
    it('应取消收藏', async () => {
      mock('del').mockResolvedValue({ deleted: true })
      await api.removeFavorite(5)
      expect(mock('del')).toHaveBeenCalledWith('/favorites/5')
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.11 优惠券模块
// ═══════════════════════════════════════════════════════════
describe('6.11 Coupons — 优惠券模块', () => {
  describe('GET /coupons', () => {
    it('应获取可用优惠券并格式化', async () => {
      mock('get').mockResolvedValue({
        list: [
          { id: '1', name: '新用户9折', type: 'discount', thresholdCents: '10000', discountRate: '0.9',
            validFrom: '2026-01-01', validTo: '2026-12-31', used: false },
          { id: '2', name: '满减券', type: 'cash', thresholdCents: '50000', discountCents: '5000',
            validFrom: '2026-01-01', validTo: '2026-06-30', used: true },
        ],
        total: 2,
      })
      const result = await api.getCoupons()
      expect(mock('get')).toHaveBeenCalledWith('/coupons')
      expect(result.list).toHaveLength(2)
      expect(result.list[0]).toMatchObject({ id: 1, name: '新用户9折', type: 'discount', used: false })
      expect(result.list[1]).toMatchObject({ id: 2, type: 'cash', used: true })
    })

    it('空响应应返回默认结构', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getCoupons()
      expect(result.list).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.12b 横幅 / 活动 / 俱乐部信息
// ═══════════════════════════════════════════════════════════
describe('6.12b Banners / Activities / Club — 横幅活动俱乐部', () => {
  describe('GET /banners', () => {
    it('应获取横幅列表（无需鉴权）', async () => {
      mock('get').mockResolvedValue({ list: [{ id: 1, title: '活动', imageUrl: '/b.jpg' }] })
      const result = await api.getBanners()
      expect(mock('get')).toHaveBeenCalledWith('/banners', null, { needAuth: false })
      expect(result).toHaveLength(1)
    })

    it('返回纯数组时应正常处理', async () => {
      mock('get').mockResolvedValue([{ id: 1, title: '活动' }])
      const result = await api.getBanners()
      expect(result).toHaveLength(1)
    })

    it('空响应应返回空数组', async () => {
      mock('get').mockResolvedValue(null)
      const result = await api.getBanners()
      expect(result).toEqual([])
    })
  })

  describe('GET /activities', () => {
    it('应获取活动列表（无需鉴权，支持分页）', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', title: '品鉴会' }], total: 1 })
      await api.getActivities({ page: 1, pageSize: 10 })
      expect(mock('get')).toHaveBeenCalledWith('/activities', { page: 1, pageSize: 10 }, { needAuth: false })
    })

    it('默认分页参数应合理', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getActivities()
      expect(mock('get')).toHaveBeenCalledWith('/activities', { page: 1, pageSize: 20 }, { needAuth: false })
    })
  })

  describe('GET /club/info', () => {
    it('应获取俱乐部信息（无需鉴权）', async () => {
      mock('get').mockResolvedValue({ name: 'GOAT CLUB', phone: '138', address: '上海', hours: '10:00-22:00' })
      const result = await api.getClubInfo()
      expect(mock('get')).toHaveBeenCalledWith('/club/info', null, { needAuth: false })
      expect(result.name).toBe('GOAT CLUB')
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 6.13 预约模块
// ═══════════════════════════════════════════════════════════
describe('6.13 Reservation — 预约模块', () => {
  describe('POST /reservation', () => {
    it('应提交品鉴预约', async () => {
      mock('post').mockResolvedValue({ reservationId: 1 })
      await api.createReservation({
        date: '2026-06-01',
        timeSlot: '14:00-16:00',
        guests: 4,
        remark: '第一次品鉴',
        contactPhone: '13800138000',
      })
      expect(mock('post')).toHaveBeenCalledWith('/reservation', {
        date: '2026-06-01',
        timeSlot: '14:00-16:00',
        guests: 4,
        remark: '第一次品鉴',
        contactPhone: '13800138000',
      })
    })

    it('可选字段可省略', async () => {
      mock('post').mockResolvedValue({ reservationId: 2 })
      await api.createReservation({ date: '2026-06-01', timeSlot: '10:00-12:00' })
      expect(mock('post')).toHaveBeenCalledWith('/reservation', {
        date: '2026-06-01', timeSlot: '10:00-12:00',
      })
    })
  })

  describe('GET /reservation', () => {
    it('应获取我的预约列表（分页）', async () => {
      mock('get').mockResolvedValue({ list: [{ id: '1', date: '2026-06-01' }], total: 1 })
      await api.getReservations({ page: 1, pageSize: 10 })
      expect(mock('get')).toHaveBeenCalledWith('/reservation', { page: 1, pageSize: 10 })
    })

    it('默认分页参数应合理', async () => {
      mock('get').mockResolvedValue({ list: [], total: 0 })
      await api.getReservations()
      expect(mock('get')).toHaveBeenCalledWith('/reservation', { page: 1, pageSize: 20 })
    })
  })
})

// ═══════════════════════════════════════════════════════════
// 跨模块数据一致性测试
// ═══════════════════════════════════════════════════════════
describe('Cross-Module — 跨模块数据一致性', () => {
  it('价格字段在 cigars/cart/orders 中均用分→元转换', async () => {
    // 雪茄详情
    mock('get').mockResolvedValueOnce({ id: '1', name: '雪茄', memberPriceCents: '35800' })
    const cigar = await api.getCigarDetail(1)
    expect(cigar.price).toBe(358)

    // 购物车
    mock('get').mockResolvedValueOnce({
      items: [{ id: '1', priceCents: '35800', qty: 1 }], totalCents: '35800',
    })
    const cart = await api.getCart()
    expect(cart.items[0].price).toBe(358)
    expect(cart.total).toBe(358)

    // 推荐结果
    mock('post').mockResolvedValueOnce({
      list: [{ id: '1', name: '推荐', memberPriceCents: '20000', ratingAvg: '4.0', score: 0.9 }],
    })
    const recs = await api.getRecommendations([{ questionId: 1, optionIndex: 0 }])
    expect(recs[0].price).toBe(200)
  })

  it('会员等级字段命名一致性：recharge/consume', async () => {
    mock('get').mockResolvedValue({
      userId: 1, nickname: 'VIP',
      balanceCents: '0', rechargeLevel: 3, consumptionLevel: 2,
      rechargePoints: 3000, consumptionPoints: 2000,
    })
    const profile = await api.getMemberProfile()
    expect(profile).toHaveProperty('recharge')
    expect(profile).toHaveProperty('consume')
    expect(profile.recharge).toHaveProperty('level')
    expect(profile.consume).toHaveProperty('level')
    expect(profile.recharge.level).toBe(3)
    expect(profile.consume.level).toBe(2)
  })

  it('ID 字段在 API 间统一为 Number 类型', async () => {
    // 雪茄
    mock('get').mockResolvedValueOnce({ id: '5', name: '雪茄' })
    const cigar = await api.getCigarDetail(5)
    expect(typeof cigar.id).toBe('number')

    // 评论
    mock('get').mockResolvedValueOnce({
      list: [{ id: '10', user: { nickname: '用户' }, rating: 4, content: '好', createdAt: '2026-01-01' }],
      total: 1,
    })
    const reviews = await api.getCigarReviews(5)
    expect(typeof reviews.list[0].id).toBe('number')

    // 购物车
    mock('get').mockResolvedValueOnce({
      items: [{ id: '3', priceCents: '10000', qty: 1, name: '雪茄' }],
      totalCents: '10000',
    })
    const cart = await api.getCart()
    expect(typeof cart.items[0].id).toBe('number')
  })
})
