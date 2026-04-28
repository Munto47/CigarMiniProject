import { Row, Col, Card, Table, Tag } from 'antd'
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
import { mockOrders, orderStatusMap } from '../../mock/orders'

const lineData = [
  { date: '05-28', orders: 8, revenue: 9600 },
  { date: '05-29', orders: 12, revenue: 14800 },
  { date: '05-30', orders: 7, revenue: 8200 },
  { date: '05-31', orders: 15, revenue: 21000 },
  { date: '06-01', orders: 18, revenue: 24600 },
  { date: '06-02', orders: 11, revenue: 13800 },
  { date: '06-03', orders: 16, revenue: 19200 },
]

const barData = [
  { name: 'Cohiba Behike 52', sold: 34 },
  { name: 'Davidoff Churchill', sold: 28 },
  { name: 'Montecristo No.2', sold: 22 },
  { name: 'Arturo Fuente OpusX', sold: 15 },
  { name: 'Padron 1964', sold: 9 },
]

const statusColorMap = {
  pending: 'warning',
  settling: 'blue',
  completed: 'success',
  cancelled: 'default',
}

const recentOrders = mockOrders.slice(0, 5)

const orderColumns = [
  { title: '订单号', dataIndex: 'id', key: 'id', render: v => <span style={{ color: '#C9A84C', fontSize: 12, fontFamily: 'monospace' }}>{v}</span> },
  { title: '用户', dataIndex: 'userName', key: 'userName', render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
  { title: '实付', dataIndex: 'actualPay', key: 'actualPay', render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v.toLocaleString()}</span> },
  {
    title: '支付方式', dataIndex: 'payMethod', key: 'payMethod',
    render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v === 'balance' ? '储值余额' : '美团收银'}</span>,
  },
  {
    title: '状态', dataIndex: 'status', key: 'status',
    render: v => <StatusBadge type={statusColorMap[v]} dot>{orderStatusMap[v]?.label}</StatusBadge>,
  },
  { title: '时间', dataIndex: 'orderTime', key: 'orderTime', render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
]

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
          {p.name}：{p.name === '营收(¥)' ? '¥' : ''}{p.value.toLocaleString()}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="数据概览" subtitle="今日运营数据实时展示" />

      {/* 统计卡 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="今日订单" value="16" icon={<ShoppingCartOutlined />} trend={14} trendLabel="较昨日" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="今日销售额" value="19,200" prefix="¥" icon={<DollarOutlined />} trend={8} trendLabel="较昨日" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="活跃会员" value="128" icon={<UserOutlined />} trend={3} trendLabel="本周新增" color="#4CAF7A" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="储值总额" value="486,200" prefix="¥" icon={<WalletOutlined />} trend={22} trendLabel="本月" color="#4C7AC9" />
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
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="营收(¥)" stroke="#4CAF7A" strokeWidth={2} dot={{ fill: '#4CAF7A', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} lg={9}>
          <div className="chart-container" style={{ height: '100%' }}>
            <div className="chart-title">销量 Top5 雪茄</div>
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
          rowKey="id"
          pagination={false}
          size="small"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  )
}
