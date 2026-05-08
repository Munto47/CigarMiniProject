import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Table, Spin } from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { getOverview, getSalesTrend, getRecentOrders, getTopProducts } from '../../api/dashboard'

const statusColorMap = {
  pending: 'warning',
  settling: 'blue',
  paid: 'processing',
  completed: 'success',
  cancelled: 'default',
  refunding: 'orange',
  refunded: 'error',
}

const statusLabelMap = {
  pending: '待支付',
  settling: '待确认',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}：{p.name === '营收' ? '¥' : ''}{p.value?.toLocaleString?.() ?? p.value}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [salesTrend, setSalesTrend] = useState([])
  const [recentOrders, setRecentOrdersList] = useState([])
  const [topProducts, setTopProductsList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, trendRes, ordersRes, topRes] = await Promise.all([
        getOverview(),
        getSalesTrend(7),
        getRecentOrders(10),
        getTopProducts(10),
      ])
      setOverview(ovRes.data.data)
      setSalesTrend(trendRes.data.data)
      setRecentOrdersList(ordersRes.data.data)
      setTopProductsList(topRes.data.data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 解析 overview 数据
  const todayOrders = overview?.orders?.today ?? 0
  const todayRevenue = overview?.revenue?.todayYuan ?? '0'
  const totalUsers = overview?.users?.total ?? 0
  const totalBalance = overview?.balance?.totalYuan ?? '0'

  // 转换销售趋势为图表数据
  const lineData = salesTrend.map((d) => ({
    date: d.date?.slice(5),  // MM-DD
    orders: d.orders,
    revenue: Number(d.revenueYuan || 0),
  }))

  // 转换 Top 产品为图表数据
  const barData = topProducts.map((p) => ({
    name: p.name,
    sold: p.soldQty,
  }))

  const orderColumns = [
    {
      title: '订单号', dataIndex: 'orderNo', key: 'orderNo',
      render: v => <span style={{ color: '#C9A84C', fontSize: 12, fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '用户', dataIndex: 'userName', key: 'userName',
      render: v => <span style={{ color: '#F5F0E8' }}>{v}</span>,
    },
    {
      title: '实付', dataIndex: 'actualPayYuan', key: 'actualPayYuan',
      render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v}</span>,
    },
    {
      title: '支付方式', dataIndex: 'payMethod', key: 'payMethod',
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v === 'balance' ? '储值余额' : v === 'meituan' ? '美团收银' : v}</span>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: v => <StatusBadge type={statusColorMap[v]} dot>{statusLabelMap[v] || v}</StatusBadge>,
    },
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span>,
    },
  ]

  return (
    <div>
      <PageHeader title="数据概览" subtitle="今日运营数据实时展示" />

      <Spin spinning={loading}>
        {/* 统计卡 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="今日订单" value={String(todayOrders)} icon={<ShoppingCartOutlined />} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="今日销售额" value={todayRevenue} prefix="¥" icon={<DollarOutlined />} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="注册用户" value={String(totalUsers)} icon={<UserOutlined />} color="#4CAF7A" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="储值总额" value={totalBalance} prefix="¥" icon={<WalletOutlined />} color="#4C7AC9" />
          </Col>
        </Row>

        {/* 图表区 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={15}>
            <div className="chart-container">
              <div className="chart-title">近7日订单趋势</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="orders" orientation="left" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="revenue" orientation="right" tick={{ fill: '#6B6560', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#9E9484', fontSize: 12 }} />
                  <Line yAxisId="orders" type="monotone" dataKey="orders" name="订单数" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C', r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="营收" stroke="#4CAF7A" strokeWidth={2} dot={{ fill: '#4CAF7A', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Col>
          <Col xs={24} lg={9}>
            <div className="chart-container" style={{ height: '100%' }}>
              <div className="chart-title">销量 Top 雪茄</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6B6560', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9E9484', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sold" name="销量" fill="url(#goldGrad)" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7A6430" />
                      <stop offset="100%" stopColor="#E8C97A" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>
        </Row>

        {/* 最新订单 */}
        <div className="chart-container">
          <div className="chart-title" style={{ marginBottom: 16 }}>最新订单</div>
          <Table
            dataSource={recentOrders}
            columns={orderColumns}
            rowKey="orderId"
            pagination={false}
            size="small"
            style={{ background: 'transparent' }}
          />
        </div>
      </Spin>
    </div>
  )
}
