import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberLevelBadge from '../../components/MemberLevelBadge'

describe('MemberLevelBadge', () => {
  it('应渲染充值等级徽章 (type=recharge)', () => {
    render(<MemberLevelBadge type="recharge" level={5} />)
    expect(screen.getByText('V5')).toBeInTheDocument()
  })

  it('应渲染消费等级徽章 (type=consumption)', () => {
    render(<MemberLevelBadge type="consumption" level={3} />)
    expect(screen.getByText('V3')).toBeInTheDocument()
  })

  it('showIcon=false 时应隐藏图标', () => {
    const { container } = render(
      <MemberLevelBadge type="recharge" level={1} showIcon={false} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeNull()
  })

  it('showIcon=true 时应显示图标', () => {
    const { container } = render(
      <MemberLevelBadge type="recharge" level={1} showIcon={true} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('size=small 时应使用较小尺寸', () => {
    const { container } = render(
      <MemberLevelBadge type="recharge" level={1} size="small" />
    )
    const span = container.querySelector('span')
    expect(span.style.padding).toBe('1px 7px')
    expect(span.style.fontSize).toBe('11px')
  })

  it('size=default 时应使用默认尺寸', () => {
    const { container } = render(
      <MemberLevelBadge type="recharge" level={1} size="default" />
    )
    const span = container.querySelector('span')
    expect(span.style.padding).toBe('2px 10px')
    expect(span.style.fontSize).toBe('12px')
  })

  it('应显示 tooltip', () => {
    const { container } = render(
      <MemberLevelBadge type="recharge" level={7} />
    )
    // antd Tooltip 会在包裹元素上设置属性
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(screen.getByText('V7')).toBeInTheDocument()
  })

  it('type=recharge 应使用金色渐变', () => {
    const { container } = render(
      <MemberLevelBadge type="recharge" level={2} />
    )
    const span = container.querySelector('span')
    expect(span.style.background).toContain('linear-gradient')
  })

  it('type=consumption 应使用棕色渐变', () => {
    const { container } = render(
      <MemberLevelBadge type="consumption" level={2} />
    )
    const span = container.querySelector('span')
    expect(span.style.background).toContain('linear-gradient')
  })

  it('应渲染等级1到9', () => {
    for (let level = 1; level <= 9; level++) {
      const { unmount } = render(
        <MemberLevelBadge type="recharge" level={level} />
      )
      expect(screen.getByText(`V${level}`)).toBeInTheDocument()
      unmount()
    }
  })
})
