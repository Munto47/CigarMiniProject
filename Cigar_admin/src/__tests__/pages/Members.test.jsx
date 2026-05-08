import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MembersPage from '../../pages/members'

vi.mock('../../api/members', () => ({
  getMembers: vi.fn(),
  getMemberDetail: vi.fn(),
  getMemberStats: vi.fn(),
  getLevelConfig: vi.fn(),
}))

import { getMembers, getMemberStats } from '../../api/members'

const mockMembers = { list: [{ id: 1, nickname: '张三', rechargeLevel: 3, consumptionLevel: 2 }], total: 1 }
const mockStats = { totalMembers: 100, highLevel: 10, midLevel: 30, lowLevel: 60 }

describe('MembersPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><MembersPage /></MemoryRouter>)
  }

  it('应调用 getMembers API', async () => {
    getMembers.mockResolvedValue({ data: { code: 0, data: mockMembers } })
    getMemberStats.mockResolvedValue({ data: { code: 0, data: mockStats } })
    renderPage()
    await waitFor(() => {
      expect(getMembers).toHaveBeenCalled()
    })
  })

  it('应调用 getMemberStats API', async () => {
    getMembers.mockResolvedValue({ data: { code: 0, data: mockMembers } })
    getMemberStats.mockResolvedValue({ data: { code: 0, data: mockStats } })
    renderPage()
    await waitFor(() => {
      expect(getMemberStats).toHaveBeenCalled()
    })
  })

  it('API 失败时不应崩溃', async () => {
    getMembers.mockRejectedValue(new Error('fail'))
    getMemberStats.mockRejectedValue(new Error('fail'))
    const { container } = renderPage()
    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })
})
