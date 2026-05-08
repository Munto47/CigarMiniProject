import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Select, Space, Drawer, Tag, Divider, message, Tooltip, Spin, Popconfirm } from 'antd'
import { SearchOutlined, ExportOutlined, SyncOutlined, EyeOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getOrders, getOrderDetail, updateOrderStatus, refundOrder, syncMeituan } from '../../api/orders'

const { Option } = Select

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'settling', label: '待确认' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunding', label: '退款中' },
  { value: 'refunded', label: '已退款' },
]

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

export default function Orders() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders({ page, pageSize, status: statusFilter || undefined })
      const body = res.data.data
      setData(body.list || [])
      setTotal(body.total || 0)
    } catch (err) {
      console.error('获取订单列表失败:', err)
      message.error('获取订单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openDetail = async (record) => {
    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      const res = await getOrderDetail(record.orderId)
      setSelected(res.data.data)
    } catch (err) {
      message.error('获取订单详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncMeituan()
      message.success('订单状态已与美团收银同步')
    } catch (err) {
      message.error(err.response?.data?.message || '同步失败')
    } finally {
      setSyncing(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateOrderStatus(id, { status: newStatus })
      message.success(`订单状态已更新为：${statusLabelMap[newStatus]}`)
      fetchData()
      if (selected) {
        setSelected({ ...selected, order: { ...selected.order, status: newStatus } })
      }
    } catch (err) {
      message.error(err.response?.data?.message || '状态更新失败')
    }
  }

  const handleRefund = async (orderId, amountCents, reason) => {
    try {
      await refundOrder(orderId, { amountCents, reason, refundChannel: 'auto' })
      message.success('退款已发起')
      fetchData()
      if (drawerOpen) openDetail({ orderId })
    } catch (err) {
      message.error(err.response?.data?.message || '退款失败')
    }
  }

  // 统计各状态数量
  const statusCounts = {}
  data.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  })

  const columns = [
    {
      title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 180,
      render: v => <span style={{ color: '#C9A84C', fontSize: 12, fontFamily: 'monospace' }}>{v}</span>,
    },
    { title: '用户', dataIndex: 'userName', key: 'userName', width: 90, render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
    {
      title: '实付', dataIndex: 'actualPayYuan', key: 'actualPayYuan', width: 90,
      render: (v, r) => (
        <div>
          <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14 }}>¥{v}</div>
          {Number(r.refundedYuan) > 0 && (
            <div style={{ color: '#C94C4C', fontSize: 11 }}>已退 ¥{r.refundedYuan}</div>
          )}
        </div>
      ),
    },
    {
      title: '支付方式', dataIndex: 'payMethod', key: 'payMethod', width: 100,
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v === 'balance' ? '储值余额' : v === 'meituan' ? '美团收银' : v}</span>,
    },
    {
      title: '状态', key: 'status', width: 80,
      render: (_, r) => <StatusBadge type={statusColorMap[r.status]} dot>{statusLabelMap[r.status]}</StatusBadge>,
    },
    {
      title: '美团同步', dataIndex: 'meituanSyncStatus', key: 'meituanSyncStatus', width: 90,
      render: v => {
        const map = { synced: 'success', not_required: 'default', not_synced: 'warning', failed_retry: 'error', out_of_sync: 'error' }
        const labelMap = { synced: '已同步', not_required: '不适用', not_synced: '未同步', failed_retry: '重试中', out_of_sync: '异常' }
        return <StatusBadge type={map[v] || 'default'}>{labelMap[v] || v}</StatusBadge>
      },
    },
    { title: '下单时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v ? new Date(v).toLocaleString('zh-CN') : '-'}</span> },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#C9A84C' }} onClick={() => openDetail(r)} />
          {r.status === 'paid' && (
            <Button type="link" size="small" style={{ color: '#4CAF7A', padding: 0, fontSize: 12 }} onClick={() => handleStatusChange(r.orderId, 'completed')}>完成</Button>
          )}
          {r.status === 'settling' && (
            <Button type="link" size="small" style={{ color: '#4CAF7A', padding: 0, fontSize: 12 }} onClick={() => handleStatusChange(r.orderId, 'completed')}>完成</Button>
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
          <Button key="export" icon={<ExportOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
            导出 Excel
          </Button>,
        ]}
      />

      {/* 状态概览 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {statusOptions.filter(s => s.value).map(s => (
          <div key={s.value} onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)} style={{
            flex: 1, background: statusFilter === s.value ? 'rgba(201,168,76,0.12)' : '#161616',
            border: `1px solid ${statusFilter === s.value ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
            borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'all 0.2s',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F0E8' }}>
              {statusCounts[s.value] || 0}
            </div>
            <div style={{ fontSize: 12, color: '#9E9484', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索订单号 / 用户" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <Select placeholder="全部状态" value={statusFilter || undefined} onChange={v => { setStatusFilter(v || ''); setPage(1) }} allowClear style={{ width: 120 }}>
          {statusOptions.filter(s => s.value).map(s => <Option key={s.value} value={s.value}>{s.label}</Option>)}
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {total} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            dataSource={data} columns={columns} rowKey="orderId" size="middle"
            pagination={{
              current: page, pageSize, total,
              showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            }}
          />
        </Spin>
      </div>

      {/* 订单详情抽屉 */}
      <Drawer
        title={`订单详情 ${selected?.order?.orderNo || ''}`}
        placement="right" width={520}
        open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelected(null) }}
      >
        <Spin spinning={detailLoading}>
          {selected && (
            <div style={{ color: '#F5F0E8' }}>
              {/* 状态 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: '#9E9484', fontSize: 13 }}>订单状态</span>
                <StatusBadge type={statusColorMap[selected.order.status]} dot>{statusLabelMap[selected.order.status]}</StatusBadge>
              </div>
              <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />

              {/* 用户信息 */}
              <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 8 }}>用户信息</div>
              <div style={{ color: '#F5F0E8', marginBottom: 16 }}>
                {selected.user?.nickname || '-'}
                <span style={{ color: '#6B6560', marginLeft: 12 }}>{selected.user?.phoneMask || ''}</span>
                <Tag color="#C9A84C" style={{ marginLeft: 8 }}>充值V{selected.user?.rechargeLevel}</Tag>
                <Tag color="#B8956A" style={{ marginLeft: 4 }}>消费V{selected.user?.consumptionLevel}</Tag>
              </div>

              {/* 商品明细 */}
              <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 8 }}>商品明细</div>
              {(selected.items || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                  <span style={{ color: '#F5F0E8', fontSize: 13 }}>{item.name} {item.spec && <span style={{ color: '#9E9484', fontSize: 11 }}>({item.spec})</span>} <span style={{ color: '#9E9484' }}>×{item.qty}</span></span>
                  <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{item.actualAmountYuan || item.memberPriceSnapshot}</span>
                </div>
              ))}

              <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#9E9484', fontSize: 13 }}>原价合计</span>
                <span style={{ color: '#F5F0E8' }}>¥{selected.order.totalYuan}</span>
              </div>
              {Number(selected.order.memberDiscountYuan) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9E9484', fontSize: 13 }}>会员折扣</span>
                  <span style={{ color: '#4CAF7A' }}>-¥{selected.order.memberDiscountYuan}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: '#C9A84C', fontWeight: 600 }}>实付金额</span>
                <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 18 }}>¥{selected.order.actualPayYuan}</span>
              </div>

              {Number(selected.order.refundedAmountCents) > 0 && (
                <div style={{ background: 'rgba(201,76,76,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <span style={{ color: '#C94C4C', fontSize: 12 }}>已退款 ¥{selected.order.refundedYuan}</span>
                </div>
              )}

              <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />
              <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 2 }}>
                <div>支付方式：{selected.order.payMethod === 'balance' ? '储值余额' : selected.order.payMethod === 'meituan' ? '美团收银' : selected.order.payMethod || '-'}</div>
                <div>美团同步：{selected.meituan?.syncStatus || '-'}</div>
                <div>下单时间：{selected.order.createdAt ? new Date(selected.order.createdAt).toLocaleString('zh-CN') : '-'}</div>
                <div>支付时间：{selected.order.paidAt ? new Date(selected.order.paidAt).toLocaleString('zh-CN') : '-'}</div>
                <div>备注：{selected.order.remark || '-'}</div>
              </div>

              {/* 退款记录 */}
              {(selected.refunds || []).length > 0 && (
                <>
                  <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '12px 0' }} />
                  <div style={{ color: '#C94C4C', fontSize: 12, marginBottom: 8 }}>退款记录</div>
                  {selected.refunds.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#9E9484', marginBottom: 4 }}>
                      {r.refundNo} ¥{r.amountYuan} [{r.status}] {r.reason}
                    </div>
                  ))}
                </>
              )}

              {/* 操作按钮 */}
              {['paid', 'completed'].includes(selected.order.status) && (
                <Button block type="primary" style={{ marginTop: 24, background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600, height: 42 }}
                  onClick={() => handleStatusChange(selected.order.id, 'completed')}>
                  标记为已完成
                </Button>
              )}
            </div>
          )}
        </Spin>
      </Drawer>
    </div>
  )
}
