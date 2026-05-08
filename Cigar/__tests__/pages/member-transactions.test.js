require('../setup')

const mockGetMemberTransactions = jest.fn()
const mockGetMemberProfile = jest.fn()
const mockIsLoggedIn = jest.fn()

jest.mock('../../utils/api', () => ({
  getMemberTransactions: mockGetMemberTransactions,
  getMemberProfile: mockGetMemberProfile,
}))
jest.mock('../../utils/request', () => ({ isLoggedIn: mockIsLoggedIn }))

global.getApp = () => ({ globalData: {} })

describe('pages/member-transactions/index', () => {
  let page
  beforeAll(() => {
    require('../../pages/member-transactions/index')
    page = global.Page.mock.calls.at(-1)[0]
  })
  beforeEach(() => {
    jest.clearAllMocks()
    page.setData = jest.fn()
    mockIsLoggedIn.mockReturnValue(true)
    mockGetMemberProfile.mockResolvedValue({ balance: 5000 })
    mockGetMemberTransactions.mockResolvedValue({
      list: [
        { id: '1', type: 'recharge', amountYuan: '1000.00', balanceAfterYuan: '5000.00',
          description: '充值', relatedNo: 'R001', createdAt: '2026-05-03 12:00' },
        { id: '2', type: 'consume', amountYuan: '-358.00', balanceAfterYuan: '4642.00',
          description: '购买雪茄', relatedNo: 'GC001', createdAt: '2026-05-02 10:00' },
      ],
      total: 2,
    })
    page.data = {
      transactions: [], balance: 0, activeTab: 0,
      page: 1, pageSize: 20, total: 0, hasMore: true, loading: false,
    }
  })

  it('data 初始状态', () => {
    expect(page.data.balance).toBe(0)
    expect(page.data.transactions).toEqual([])
  })

  describe('onLoad', () => {
    it('未登录时提示并返回', () => {
      mockIsLoggedIn.mockReturnValue(false)
      page.onLoad()
      expect(wx.showToast).toHaveBeenCalled()
    })

    it('已登录时拉取余额和交易', () => {
      page.onLoad()
      expect(mockGetMemberProfile).toHaveBeenCalled()
      expect(mockGetMemberTransactions).toHaveBeenCalled()
    })
  })

  describe('_fetchBalance', () => {
    it('成功获取余额', async () => {
      await page._fetchBalance()
      expect(page.setData).toHaveBeenCalledWith({ balance: 5000 })
    })

    it('余额获取失败时静默', async () => {
      mockGetMemberProfile.mockRejectedValue(new Error('fail'))
      await expect(page._fetchBalance()).resolves.toBeUndefined()
    })
  })

  describe('_fetchTransactions', () => {
    it('加载中时不重复请求', async () => {
      page.data.loading = true
      await page._fetchTransactions()
      expect(mockGetMemberTransactions).not.toHaveBeenCalled()
    })

    it('成功加载交易记录并格式化', async () => {
      await page._fetchTransactions(true)
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({ type: 'recharge', typeLabel: '充值', sign: '+' }),
            expect.objectContaining({ type: 'consume', typeLabel: '消费', sign: '-' }),
          ]),
        })
      )
    })

    it('加载失败时结束loading', async () => {
      mockGetMemberTransactions.mockRejectedValue(new Error('fail'))
      await page._fetchTransactions()
      expect(page.setData).toHaveBeenCalledWith({ loading: false })
    })
  })

  describe('switchTab', () => {
    it('切换筛选标签', () => {
      page._fetchTransactions = jest.fn()
      page.switchTab({ currentTarget: { dataset: { index: 1 } } })
      expect(page.setData).toHaveBeenCalledWith(
        expect.objectContaining({ activeTab: 1, transactions: [], page: 1 })
      )
    })
  })
})
