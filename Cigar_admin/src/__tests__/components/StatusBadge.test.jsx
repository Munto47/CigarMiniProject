import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../../components/StatusBadge'

describe('StatusBadge', () => {
  it('应渲染 children 内容', () => {
    render(<StatusBadge>已完成</StatusBadge>)
    expect(screen.getByText('已完成')).toBeInTheDocument()
  })

  it('默认 type 应为 default', () => {
    const { container } = render(<StatusBadge>默认</StatusBadge>)
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
  })

  it('dot 模式应渲染圆点', () => {
    const { container } = render(<StatusBadge dot>在线</StatusBadge>)
    // dot 会渲染一个宽高6px的圆点span
    const spans = container.querySelectorAll('span')
    const dotSpan = Array.from(spans).find(
      s => s.style.width === '6px' && s.style.borderRadius === '50%'
    )
    expect(dotSpan).toBeTruthy()
  })

  it('无 dot 时不渲染圆点', () => {
    const { container } = render(<StatusBadge>无圆点</StatusBadge>)
    const spans = container.querySelectorAll('span')
    const dotSpan = Array.from(spans).find(
      s => s.style.width === '6px'
    )
    expect(dotSpan).toBeFalsy()
  })

  // 测试每种 type 颜色映射
  const types = ['success', 'warning', 'danger', 'gold', 'default', 'blue', 'silver']
  types.forEach(type => {
    it(`type="${type}" 应正确渲染`, () => {
      const { container } = render(<StatusBadge type={type}>{type}</StatusBadge>)
      const span = container.querySelector('span')
      expect(span).toBeInTheDocument()
      // 验证背景色存在
      expect(span.style.background).toBeTruthy()
      expect(span.style.color).toBeTruthy()
      expect(span.style.border).toBeTruthy()
    })
  })

  it('type=success 应使用绿色', () => {
    const { container } = render(<StatusBadge type="success">成功</StatusBadge>)
    const span = container.querySelector('span')
    expect(span.style.color).toBe('rgb(76, 175, 122)')
  })

  it('type=danger 应使用红色', () => {
    const { container } = render(<StatusBadge type="danger">失败</StatusBadge>)
    const span = container.querySelector('span')
    expect(span.style.color).toBe('rgb(201, 76, 76)')
  })

  it('type=gold 应使用金色', () => {
    const { container } = render(<StatusBadge type="gold">金卡</StatusBadge>)
    const span = container.querySelector('span')
    expect(span.style.color).toBe('rgb(201, 168, 76)')
  })

  it('未知 type 应回退到 default 样式', () => {
    const { container } = render(<StatusBadge type="unknown">未知</StatusBadge>)
    const span = container.querySelector('span')
    expect(span.style.color).toBe('rgb(158, 148, 132)') // default color
  })
})
