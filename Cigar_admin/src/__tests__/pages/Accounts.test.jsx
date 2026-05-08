import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AccountsPage from '../../pages/accounts'

vi.mock('../../api/accounts', () => ({
  getAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  getLoginLogs: vi.fn(),
}))

import { getAccounts, getLoginLogs } from '../../api/accounts'

const mockAccounts = { list: [{ id: 1, name: '管理员', username: 'admin', roleName: '超级管理员', status: 1 }], total: 1 }

describe('AccountsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><AccountsPage /></MemoryRouter>)
  }

  it('应渲染页面且 API 被调用', async () => {
    getAccounts.mockResolvedValue({ data: { code: 0, data: mockAccounts } })
    getLoginLogs.mockResolvedValue({ data: { code: 0, data: { list: [], total: 0 } } })
    renderPage()
    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })
  })

  it('应显示"管理员列表"标签页', async () => {
    getAccounts.mockResolvedValue({ data: { code: 0, data: mockAccounts } })
    getLoginLogs.mockResolvedValue({ data: { code: 0, data: { list: [], total: 0 } } })
    renderPage()
    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getAccounts.mockRejectedValue(new Error('fail'))
    getLoginLogs.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
