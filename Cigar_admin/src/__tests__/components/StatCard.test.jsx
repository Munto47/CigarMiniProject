import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from '../../components/StatCard'

describe('StatCard', () => {
  it('应渲染 title', () => {
    render(<StatCard title="总销售额" value="12,580" />)
    expect(screen.getByText('总销售额')).toBeInTheDocument()
  })

  it('应渲染 value', () => {
    render(<StatCard title="总销售额" value="12,580" />)
    expect(screen.getByText('12,580')).toBeInTheDocument()
  })

  it('应渲染 prefix', () => {
    render(<StatCard title="收入" value="12,580" prefix="¥" />)
    expect(screen.getByText('¥')).toBeInTheDocument()
  })

  it('应渲染 suffix', () => {
    render(<StatCard title="收入" value="12,580" suffix="元" />)
    expect(screen.getByText('元')).toBeInTheDocument()
  })

  it('正向 trend 应显示绿色上升箭头', () => {
    render(<StatCard title="增长" value="12,580" trend={15} />)
    expect(screen.getByText('15%')).toBeInTheDocument()
  })

  it('负向 trend 应显示红色下降箭头', () => {
    render(<StatCard title="增长" value="8,200" trend={-5} trendLabel="较上周" />)
    expect(screen.getByText('5%')).toBeInTheDocument()
    expect(screen.getByText('较上周')).toBeInTheDocument()
  })

  it('应渲染 icon', () => {
    const icon = <span data-testid="test-icon">★</span>
    render(<StatCard title="评分" value="4.8" icon={icon} />)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('应使用自定义 color', () => {
    const icon = <span data-testid="custom-icon">★</span>
    const { container } = render(
      <StatCard title="自定义" value="100" icon={icon} color="#FF0000" />
    )
    // 验证 prefix 使用自定义颜色
    const prefixEl = container.querySelector('.stat-card')
    expect(prefixEl).toBeInTheDocument()
  })

  it('无 trend 时不渲染趋势区域', () => {
    render(<StatCard title="无趋势" value="1" />)
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('无 icon 时不渲染图标区域', () => {
    const { container } = render(<StatCard title="无图标" value="1" />)
    const iconDiv = container.querySelector('[style*="border-radius: 12px"]')
    expect(iconDiv).not.toBeInTheDocument()
  })
})
