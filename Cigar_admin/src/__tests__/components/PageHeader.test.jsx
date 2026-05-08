import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageHeader from '../../components/PageHeader'

describe('PageHeader', () => {
  it('应渲染 title', () => {
    render(<PageHeader title="仪表盘" />)
    expect(screen.getByText('仪表盘')).toBeInTheDocument()
  })

  it('应渲染 subtitle', () => {
    render(<PageHeader title="仪表盘" subtitle="数据概览" />)
    expect(screen.getByText('数据概览')).toBeInTheDocument()
  })

  it('无 subtitle 时不渲染副标题', () => {
    const { container } = render(<PageHeader title="仪表盘" />)
    expect(container.querySelector('[style*="marginTop: 4px"]')).not.toBeInTheDocument()
  })

  it('应渲染 breadcrumbs', () => {
    render(<PageHeader title="详情" breadcrumbs={['首页', '订单管理']} />)
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('订单管理')).toBeInTheDocument()
  })

  it('空 breadcrumbs 时不渲染面包屑', () => {
    render(<PageHeader title="仪表盘" breadcrumbs={[]} />)
    // 面包屑不会渲染
    const breadcrumb = document.querySelector('.ant-breadcrumb')
    expect(breadcrumb).not.toBeInTheDocument()
  })

  it('应渲染 extra 操作按钮', () => {
    const extra = [<button key="1" data-testid="btn1">新建</button>]
    render(<PageHeader title="管理" extra={extra} />)
    expect(screen.getByTestId('btn1')).toBeInTheDocument()
  })

  it('无 extra 时不渲染操作区域', () => {
    render(<PageHeader title="管理" />)
    // Space 组件不会被渲染
    const space = document.querySelector('.ant-space')
    expect(space).not.toBeInTheDocument()
  })
})
