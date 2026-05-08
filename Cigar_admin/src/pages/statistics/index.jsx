import { useState, useEffect, useCallback } from 'react'
import { Tabs, Table, Button, message, Spin, DatePicker, Space } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import { getStatisticsSales, getStatisticsCategories, getStatisticsUsers, getStatisticsStoredValue, exportStatistics } from '../../api/statistics'
import dayjs from 'dayjs'

const GOLD = '#C9A84C'
const COLORS = ['#C9A84C', '#4CAF7A', '#4C7AC9', '#C94C4C', '#E8A04C']

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
  <div style={{ marginBottom: 16 }}>
    <div style={{ color: '#9E9484', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

export default function Statistics() {
  const [salesData, setSalesData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [userData, setUserData] = useState([])
  const [storedValueData, setStoredValueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = dateRange[0]?.format('YYYY-MM-DD')
      const endDate = dateRange[1]?.format('YYYY-MM-DD')
      const [salesRes, catRes, userRes, svRes] = await Promise.all([
        getStatisticsSales({ startDate, endDate }),
        getStatisticsCategories({ startDate, endDate }),
        getStatisticsUsers({ startDate, endDate }),
        getStatisticsStoredValue({ startDate, endDate }),
      ])

      const salesBody = salesRes.data?.data
      setSalesData(salesBody?.daily || salesBody?.list || [])

      const catBody = catRes.data?.data
      setCategoryData(catBody?.list || [])

      const userBody = userRes.data?.data
      setUserData(userBody?.list || userBody?.monthly || [])

      const svBody = svRes.data?.data
      setStoredValueData(svBody?.list || svBody?.monthly || [])
    } catch (err) {
      console.error('获取统计数据失败:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleExport = async () => {
    try {
      await exportStatistics({
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
      })
      message.success('报表导出成功')
    } catch (err) {
      message.error(err.response?.data?.message || '导出失败')
    }
  }

  const formatCents = (v) => v ? Number(v) / 100 : 0

  const salesTableCols = [
    { title: '日期', key: 'date', width: 120, render: (_, r) => <span style={{ color: '#F5F0E8' }}>{r.date || r.month || '-'}</span> },
    { title: '营收', key: 'revenue', render: (_, r) => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{formatCents(r.revenue || r.revenueCents || r.totalAmount).toLocaleString()}</span> },
    { title: '订单数', key: 'orders', render: (_, r) => <span style={{ color: '#F5F0E8' }}>{r.orders || r.orderCount || 0}</span> },
    { title: '客单价', key: 'avg', render: (_, r) => {
      const rev = formatCents(r.revenue || r.revenueCents || r.totalAmount)
      const cnt = r.orders || r.orderCount || 1
      return <span style={{ color: '#9E9484' }}>¥{Math.round(rev / cnt).toLocaleString()}</span>
    }},
  ]

  const tabItems = [
    {
      key: 'sales', label: '销售报表',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <DatePicker.RangePicker value={dateRange} onChange={v => v && setDateRange(v)} />
            <Button onClick={fetchAll}>查询</Button>
          </div>
          <Spin spinning={loading}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <ChartWrapper title="销售趋势">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={salesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                    <XAxis dataKey="date" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" name="营收(¥)" stroke={GOLD} strokeWidth={2} dot={false}
                      data={salesData.map(d => ({ ...d, revenue: formatCents(d.revenue || d.revenueCents || d.totalAmount) }))} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>
              <ChartWrapper title="分类销售占比">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>
            <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              <Table dataSource={salesData} columns={salesTableCols} rowKey={(r) => r.date || r.month || Math.random()} size="middle" pagination={false} />
            </div>
          </Spin>
        </div>
      ),
    },
    {
      key: 'users', label: '用户分析',
      children: (
        <Spin spinning={loading}>
          <ChartWrapper title="用户增长趋势">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={userData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
                <Bar dataKey="total" name="总会员数" fill="rgba(201,168,76,0.3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active" name="活跃会员" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </Spin>
      ),
    },
    {
      key: 'storedvalue', label: '储值分析',
      children: (
        <Spin spinning={loading}>
          <ChartWrapper title="储值充值 vs 消费">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={storedValueData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
                <Bar dataKey="recharge" name="充值额(¥)" fill={GOLD} radius={[4, 4, 0, 0]} />
                <Bar dataKey="consume" name="消费额(¥)" fill="#4CAF7A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </Spin>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="数据统计"
        subtitle="运营数据分析与报表导出"
        extra={[
          <Button key="export" icon={<ExportOutlined />} onClick={handleExport}
            style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
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
