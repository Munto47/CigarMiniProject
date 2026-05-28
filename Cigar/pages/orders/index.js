const { getOrderList, cancelOrder } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

const STATUS_MAP = {
  pending:   { label: '待支付', color: '#E8C97A' },
  paid:      { label: '已支付', color: '#4CAF7A' },
  settling:  { label: '处理中', color: '#4C7AC9' },
  completed: { label: '已完成', color: '#4CAF7A' },
  cancelled: { label: '已取消', color: '#6B6560' },
  refunding: { label: '退款中', color: '#C94C4C' },
  refunded:  { label: '已退款', color: '#6B6560' },
}

const STATUS_TABS = ['全部', '待支付', '已支付', '已完成']

Page({
  data: {
    orders: [],
    activeTab: 0,
    statusTabs: STATUS_TABS,
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loading: false,
  },

  async onLoad() {
    if (!isLoggedIn()) {
      const loggedIn = await getApp().promptLogin({ message: '查看订单前请先登录' })
      if (!loggedIn) {
        setTimeout(() => wx.navigateBack(), 1000)
        return
      }
    }
    this._fetchOrders()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._fetchOrders()
    }
  },

  async _fetchOrders(reset = false) {
    if (this.data.loading) return
    this.setData({ loading: true })

    const page = reset ? 1 : (this.data.page || 1)
    const status = this.data.activeTab === 0 ? 'all' :
      ['pending', 'paid', 'completed'][this.data.activeTab - 1]

    try {
      const res = await getOrderList({ page, pageSize: this.data.pageSize, status })
      const list = (res && res.list) ? res.list : []
      const orders = list.map(o => ({
        id: Number(o.id),
        orderNo: o.orderNo || '',
        status: o.status || 'pending',
        statusLabel: STATUS_MAP[o.status] ? STATUS_MAP[o.status].label : o.status,
        statusColor: STATUS_MAP[o.status] ? STATUS_MAP[o.status].color : '#9E9484',
        total: o.actualPayYuan || o.totalYuan || '0.00',
        itemCount: (o.orderItems || o.items || []).length,
        items: (o.orderItems || o.items || []).slice(0, 3).map(i => i.name || i.cigarName || '商品'),
        createdAt: o.createdAt ? o.createdAt.slice(0, 16) : '',
      }))

      const total = res.total || 0
      if (reset) {
        this.setData({ orders, page: 2, total, hasMore: orders.length < total })
      } else {
        const merged = [...this.data.orders, ...orders]
        this.setData({
          orders: merged,
          page: page + 1,
          total,
          hasMore: merged.length < total,
        })
      }
    } catch {
      // 静默
    } finally {
      this.setData({ loading: false })
    }
  },

  async onPullDownRefresh() {
    await this._fetchOrders(true)
    wx.stopPullDownRefresh()
  },

  switchTab(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ activeTab: idx, orders: [], page: 1 })
    this._fetchOrders(true)
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/checkout/checkout?orderId=${id}` })
  },

  cancelOrder(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '取消订单',
      content: '确认取消该订单吗？',
      confirmText: '确认取消',
      confirmColor: '#C94C4C',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await cancelOrder(id)
          wx.showToast({ title: '订单已取消', icon: 'success' })
          this._fetchOrders(true)
        } catch {
          // 错误已在 request 层提示
        }
      },
    })
  },

  async payOrder(e) {
    const { id } = e.currentTarget.dataset
    const { payOrder } = require('../../utils/api')
    try {
      wx.showLoading({ title: '支付中...', mask: true })
      const result = await payOrder(id, 'balance')
      wx.hideLoading()
      if (result.paid) {
        wx.showToast({ title: '支付成功', icon: 'success' })
        this._fetchOrders(true)
      }
    } catch {
      wx.hideLoading()
    }
  },
})
