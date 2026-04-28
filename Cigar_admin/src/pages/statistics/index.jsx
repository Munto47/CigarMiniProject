import { useState } from 'react'
import { Tabs, Table, Button, message } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageHeader from '../../components/PageHeader'

const GOLD = '#C9A84C'
const COLORS = ['#C9A84C', '#4CAF7A', '#4C7AC9', '#C94C4C', '#E8A04C']

const salesData = [
  { month: '1月', revenue: 42000, orders: 32 },
  { month: '2月', revenue: 38000, orders: 28 },
  { month: '3月', revenue: 55000, orders: 41 },
  { month: '4月', revenue: 61000, orders: 48 },
  { month: '5月', revenue: 72000, orders: 56 },
  { month: '6月', revenue: 48000, orders: 37 },
]

const categoryData = [
  { name: '古巴雪茄', value: 42 },
  { name: '多米尼加', value: 35 },
  { name: '尼加拉瓜', value: 15 },
  { name: '其他', value: 8 },
]

const userGrowth = [
  { month: '1月', total: 45, active: 28 },
  { month: '2月', total: 62, active: 35 },
  { month: '3月', total: 78, active: 48 },
  { month: '4月', total: 95, active: 61 },
  { month: '5月', total: 112, active: 72 },
  { month: '6月', total: 128, active: 85 },
]

const storedValueData = [
  { month: '1月', recharge: 28000, consume: 15000 },
  { month: '2月', recharge: 35000, consume: 22000 },
  { month: '3月', recharge: 42000, consume: 28000 },
  { month: '4月', recharge: 38000, consume: 31000 },
  { month: '5月', recharge: 55000, consume: 38000 },
  { month: '6月', recharge: 48000, consume: 42000 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.name}：{typeof p.value === 'number' && p.value > 1000 ? `¥${p.value.toLocaleString()}` : p.value}</div>
      ))}
    </div>
  )
}

const ChartWrapper = ({ title, children }) => (
  <div className="chart-container" style={{ marginBottom: 16 }}>
    <div className="chart-title">{title}</div>
    {children}
  </div>
)

const salesTableCols = [
  { title: '月份', dataIndex: 'month', key: 'month', render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
  { title: '营收', dataIndex: 'revenue', key: 'revenue', render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v.toLocaleString()}</span>, sorter: (a, b) => a.revenue - b.revenue },
  { title: '订单数', dataIndex: 'orders', key: 'orders', render: v => <span style={{ color: '#F5F0E8' }}>{v}</span>, sorter: (a, b) => a.orders - b.orders },
  { title: '客单价', key: 'avg', render: (_, r) => <span style={{ color: '#9E9484' }}>¥{Math.round(r.revenue / r.orders).toLocaleString()}</span> },
]

export default function Statistics() {
  const tabItems = [
    {
      key: 'sales', label: '销售报表',
      children: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <ChartWrapper title="月度销售趋势">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" name="营收(¥)" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrapper>
            <ChartWrapper title="分类销售占比">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
            <Table dataSource={salesData} columns={salesTableCols} rowKey="month" size="middle" pagination={false} />
          </div>
        </div>
      ),
    },
    {
      key: 'users', label: '用户分析',
      children: (
        <ChartWrapper title="用户增长趋势">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={userGrowth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
              <XAxis dataKey="month" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
              <Bar dataKey="total" name="总会员数" fill="rgba(201,168,76,0.3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="active" name="活跃会员" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      ),
    },
    {
      key: 'storedvalue', label: '储值分析',
      children: (
        <ChartWrapper title="月度储值充值 vs 消费">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={storedValueData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
              <XAxis dataKey="month" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
              <Bar dataKey="recharge" name="充值额(¥)" fill={GOLD} radius={[4, 4, 0, 0]} />
              <Bar dataKey="consume" name="消费额(¥)" fill="#4CAF7A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="数据统计"
        subtitle="运营数据分析与报表导出"
        extra={[
          <Button key="export" icon={<ExportOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }} onClick={() => message.success('报表导出成功（演示）')}>
            导出报表
          </Button>,
        ]}
      />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} />
      </div>
    </div>
  )
}
