import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../../pages/settings'

vi.mock('../../api/settings', () => ({
  getSettings: vi.fn(),
  updateSetting: vi.fn(),
  getOperationLogs: vi.fn(),
  testMeituanConnection: vi.fn(),
}))

vi.mock('../../api/upload', () => ({
  uploadImage: vi.fn(),
}))

import { getSettings, getOperationLogs } from '../../api/settings'

describe('SettingsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  function renderPage() {
    return render(<MemoryRouter><SettingsPage /></MemoryRouter>)
  }

  it('应渲染页面而不崩溃', () => {
    const { container } = renderPage()
    expect(container).toBeTruthy()
  })

  it('API mock 设置正确，页面不崩溃', () => {
    getSettings.mockResolvedValue({ data: { code: 0, data: {} } })
    getOperationLogs.mockResolvedValue({ data: { code: 0, data: { list: [], total: 0 } } })
    const { container } = renderPage()
    expect(container).toBeTruthy()
  })
})
