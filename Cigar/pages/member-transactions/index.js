const { getMemberTransactions, getMemberProfile } = require('../../utils/api')
const { isLoggedIn } = require('../../utils/request')

const TYPE_LABELS = {
  recharge:      { label: '充值', sign: '+' },
  consume:       { label: '消费', sign: '-' },
  refund:        { label: '退款', sign: '+' },
  adjust:        { label: '调整', sign: '' },
  consume_revoke:{ label: '消费撤销', sign: '+' },
}

const FILTER_TABS = ['全部', '充值', '消费', '退款']

Page({
  data: {
    transactions: [],
    balance: 0,
    activeTab: 0,
    filterTabs: FILTER_TABS,
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loading: false,
  },

  async onLoad() {
    if (!isLoggedIn()) {
      const loggedIn = await getApp().promptLogin({ message: '查看余额流水前请先登录' })
      if (!loggedIn) {
        setTimeout(() => wx.navigateBack(), 1000)
        return
      }
    }
    this._fetchBalance()
    this._fetchTransactions()
  },

  async _fetchBalance() {
    try {
      const profile = await getMemberProfile()
      if (profile) this.setData({ balance: profile.balance || 0 })
    } catch { /* ignore */ }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this._fetchTransactions()
    }
  },

  async _fetchTransactions(reset = false) {
    if (this.data.loading) return
    this.setData({ loading: true })

    const page = reset ? 1 : this.data.page
    const type = this.data.activeTab === 0 ? 'all' :
      ['recharge', 'consume', 'refund'][this.data.activeTab - 1]

    try {
      const res = await getMemberTransactions({ page, pageSize: this.data.pageSize, type })
      const list = (res && res.list) ? res.list : []
      const transactions = list.map(tx => {
        const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, sign: '' }
        return {
          id: Number(tx.id),
          type: tx.type,
          typeLabel: typeInfo.label,
          sign: typeInfo.sign,
          amount: tx.amountYuan || '0.00',
          balanceAfter: tx.balanceAfterYuan || '0.00',
          description: tx.description || '',
          relatedNo: tx.relatedNo || '',
          createdAt: tx.createdAt ? tx.createdAt.slice(0, 16) : '',
        }
      })

      const total = res.total || 0
      if (reset) {
        this.setData({ transactions, page: 2, total, hasMore: transactions.length < total })
      } else {
        const merged = [...this.data.transactions, ...transactions]
        this.setData({
          transactions: merged,
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
    await this._fetchTransactions(true)
    wx.stopPullDownRefresh()
  },

  switchTab(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ activeTab: idx, transactions: [], page: 1 })
    this._fetchTransactions(true)
  },
})
