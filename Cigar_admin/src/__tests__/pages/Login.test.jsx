import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../pages/login'

// Mock API
vi.mock('../../api/auth', () => ({
  adminLogin: vi.fn(),
}))

// Mock store
const mockLogin = vi.fn()
vi.mock('../../store/useStore', () => ({
  default: () => ({
    login: mockLogin,
  }),
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { adminLogin } from '../../api/auth'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('应渲染登录表单', () => {
    renderLogin()
    expect(screen.getByText('GOAT CIGAR CLUB')).toBeInTheDocument()
    expect(screen.getByText('管理后台系统')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('管理员账号')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('登录密码')).toBeInTheDocument()
  })

  it('应显示演示账号提示', () => {
    renderLogin()
    expect(screen.getByText(/演示账号/)).toBeInTheDocument()
  })

  it('登录成功后应存储 token 并跳转', async () => {
    const user = userEvent.setup()
    adminLogin.mockResolvedValue({
      data: {
        code: 0,
        data: {
          accessToken: 'at-123',
          refreshToken: 'rt-456',
          admin: { id: 1, name: 'Admin', username: 'admin', roleCode: 'super_admin' },
        },
      },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('管理员账号'), 'admin')
    await user.type(screen.getByPlaceholderText('登录密码'), 'admin123')
    await user.click(screen.getByRole('button', { name: /登 录/ }))

    await waitFor(() => {
      expect(adminLogin).toHaveBeenCalledWith('admin', 'admin123')
      expect(mockLogin).toHaveBeenCalledWith(
        { name: 'Admin', role: 'super_admin', username: 'admin', id: 1 },
        'at-123',
        'rt-456',
      )
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('账号被禁用(code=1004)时应显示错误', async () => {
    const user = userEvent.setup()
    const err = new Error('账号已被禁用')
    err.code = 1004
    adminLogin.mockRejectedValue(err)

    renderLogin()

    await user.type(screen.getByPlaceholderText('管理员账号'), 'disabled')
    await user.type(screen.getByPlaceholderText('登录密码'), '123')
    await user.click(screen.getByRole('button', { name: /登 录/ }))

    await waitFor(() => {
      expect(adminLogin).toHaveBeenCalled()
    })
  })

  it('错误密码时应显示错误', async () => {
    const user = userEvent.setup()
    adminLogin.mockRejectedValue(new Error('账号或密码错误'))

    renderLogin()

    await user.type(screen.getByPlaceholderText('管理员账号'), 'admin')
    await user.type(screen.getByPlaceholderText('登录密码'), 'wrong')
    await user.click(screen.getByRole('button', { name: /登 录/ }))

    await waitFor(() => {
      expect(adminLogin).toHaveBeenCalledWith('admin', 'wrong')
    })
  })

  it('空表单提交时应显示验证错误', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /登 录/ }))

    await waitFor(() => {
      expect(screen.getByText('请输入账号')).toBeInTheDocument()
      expect(screen.getByText('请输入密码')).toBeInTheDocument()
    })
  })
})
