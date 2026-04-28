import { useState } from 'react'
import { Table, Button, Input, Select, Space, Drawer, Tag, Divider, message, Tooltip } from 'antd'
import { SearchOutlined, ExportOutlined, SyncOutlined, EyeOutlined } from '@ant-design/icons'
import { mockOrders, orderStatusMap } from '../../mock/orders'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'

const { Option } = Select

const statusColorMap = {
  pending: 'warning',
  settling: 'blue',
  completed: 'success',
  cancelled: 'default',
}

export default function Orders() {
  const [data, setData] = useState(mockOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const filtered = data.filter(o =>
    (!search || o.id.includes(search) || o.userName.includes(search)) &&
    (!statusFilter || o.status === statusFilter)
  )

  const openDetail = (record) => { setSelected(record); setDrawerOpen(true) }

  const handleSync = async () => {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1500))
    setSyncing(false)
    message.success('订单状态已与美团收银同步')
  }

  const handleStatusChange = (id, newStatus) => {
    setData(d => d.map(o => o.id === id ? { ...o, status: newStatus } : o))
    message.success(`订单状态已更新为：${orderStatusMap[newStatus].label}`)
  }

  const columns = [
    {
      title: '订单号', dataIndex: 'id', key: 'id', width: 180,
      render: v => <span style={{ color: '#C9A84C', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer' }}>{v}</span>,
    },
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 90, render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
    {
      title: '商品', key: 'items', width: 180,
      render: (_, r) => (
        <div style={{ fontSize: 12, color: '#9E9484' }}>
          {r.items.map((item, i) => <div key={i}>{item.name} ×{item.qty}</div>)}
        </div>
      ),
    },
    {
      title: '金额', key: 'pay', width: 130,
      render: (_, r) => (
        <div>
          <div style={{ color: '#9E9484', fontSize: 11, textDecoration: 'line-through' }}>¥{r.total.toLocaleString()}</div>
          <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14 }}>¥{r.actualPay.toLocaleString()}</div>
          <div style={{ color: '#6B6560', fontSize: 11 }}>折扣 -¥{r.memberDiscount}</div>
        </div>
      ),
    },
    {
      title: '支付方式', dataIndex: 'payMethod', key: 'payMethod', width: 100,
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v === 'balance' ? '💰 储值余额' : '🏪 美团收银'}</span>,
    },
    {
      title: '状态', key: 'status', width: 100,
      render: (_, r) => <StatusBadge type={statusColorMap[r.status]} dot>{orderStatusMap[r.status]?.label}</StatusBadge>,
    },
    { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', width: 140, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#C9A84C' }} onClick={() => openDetail(r)} />
          {r.status === 'pending' && (
            <Button type="link" size="small" style={{ color: '#4CAF7A', padding: 0, fontSize: 12 }} onClick={() => handleStatusChange(r.id, 'settling')}>结算</Button>
          )}
          {r.status === 'settling' && (
            <Button type="link" size="small" style={{ color: '#4CAF7A', padding: 0, fontSize: 12 }} onClick={() => handleStatusChange(r.id, 'completed')}>完成</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="订单管理"
        subtitle="查看和处理所有用户订单"
        extra={[
          <Button key="sync" icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing}
            style={{ color: '#4CAF7A', borderColor: 'rgba(76,175,122,0.3)' }}>
            同步美团
          </Button>,
          <Button key="export" icon={<ExportOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }} onClick={() => message.success('导出成功（演示）')}>
            导出 Excel
          </Button>,
        ]}
      />

      {/* 状态概览 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {Object.entries(orderStatusMap).map(([k, v]) => (
          <div key={k} onClick={() => setStatusFilter(statusFilter === k ? '' : k)} style={{
            flex: 1, background: statusFilter === k ? 'rgba(201,168,76,0.12)' : '#161616',
            border: `1px solid ${statusFilter === k ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
            borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'all 0.2s',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F0E8' }}>
              {data.filter(o => o.status === k).length}
            </div>
            <div style={{ fontSize: 12, color: '#9E9484', marginTop: 4 }}>{v.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索订单号 / 用户" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <Select placeholder="全部状态" value={statusFilter || undefined} onChange={setStatusFilter} allowClear style={{ width: 120 }}>
          {Object.entries(orderStatusMap).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {filtered.length} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
      </div>

      {/* 订单详情抽屉 */}
      <Drawer
        title={`订单详情 ${selected?.id || ''}`}
        placement="right" width={480}
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
      >
        {selected && (
          <div style={{ color: '#F5F0E8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: '#9E9484', fontSize: 13 }}>订单状态</span>
              <StatusBadge type={statusColorMap[selected.status]} dot>{orderStatusMap[selected.status]?.label}</StatusBadge>
            </div>
            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />
            <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 8 }}>用户信息</div>
            <div style={{ color: '#F5F0E8', marginBottom: 16 }}>{selected.userName}</div>

            <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 8 }}>商品明细</div>
            {selected.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <span style={{ color: '#F5F0E8', fontSize: 13 }}>{item.name} <span style={{ color: '#9E9484' }}>×{item.qty}</span></span>
                <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{(item.memberPrice * item.qty).toLocaleString()}</span>
              </div>
            ))}

            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#9E9484', fontSize: 13 }}>商品合计</span>
              <span style={{ color: '#F5F0E8' }}>¥{selected.total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#9E9484', fontSize: 13 }}>会员折扣</span>
              <span style={{ color: '#4CAF7A' }}>-¥{selected.memberDiscount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: '#C9A84C', fontWeight: 600 }}>实付金额</span>
              <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 18 }}>¥{selected.actualPay.toLocaleString()}</span>
            </div>

            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />
            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 2 }}>
              <div>支付方式：{selected.payMethod === 'balance' ? '储值余额' : '美团收银'}</div>
              <div>提货时间：{selected.pickupTime}</div>
              <div>下单时间：{selected.orderTime}</div>
            </div>

            {selected.status === 'pending' && (
              <Button block type="primary" style={{ marginTop: 24, background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600, height: 42 }}
                onClick={() => { handleStatusChange(selected.id, 'settling'); setSelected({ ...selected, status: 'settling' }) }}>
                标记为待结算
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
