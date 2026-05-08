import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Select, Avatar, Tabs, Drawer, Divider, message, Spin } from 'antd'
import { SearchOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons'
import { getMembers, getMemberDetail, getMemberStats, getLevelConfig } from '../../api/members'
import PageHeader from '../../components/PageHeader'
import MemberLevelBadge from '../../components/MemberLevelBadge'
import StatusBadge from '../../components/StatusBadge'

const { Option } = Select

const rechargeLevels = [...Array(9)].map((_, i) => i + 1)

export default function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [search, setSearch] = useState('')
  const [rechargeLevelFilter, setRechargeLevelFilter] = useState(null)
  const [consumptionLevelFilter, setConsumptionLevelFilter] = useState(null)

  const [stats, setStats] = useState({ totalMembers: 0, highLevel: 0, midLevel: 0, lowLevel: 0 })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [levelConfigs, setLevelConfigs] = useState({ recharge: [], consumption: [] })

  const fetchMembers = useCallback(async (p, ps, kw, rl, cl) => {
    setLoading(true)
    try {
      const params = { page: p, pageSize: ps }
      if (kw) params.keyword = kw
      if (rl) params.rechargeLevel = rl
      if (cl) params.consumptionLevel = cl
      const res = await getMembers(params)
      const d = res.data.data
      setMembers(d.list || [])
      setTotal(d.total || 0)
    } catch {
      message.error('获取会员列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await getMemberStats()
      setStats(res.data.data)
    } catch {
      // stats are non-critical
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchMembers(1, pageSize, search, rechargeLevelFilter, consumptionLevelFilter)
  }, [])

  useEffect(() => {
    setPage(1)
    fetchMembers(1, pageSize, search, rechargeLevelFilter, consumptionLevelFilter)
  }, [search, rechargeLevelFilter, consumptionLevelFilter])

  const handlePageChange = (p, ps) => {
    setPage(p)
    setPageSize(ps)
    fetchMembers(p, ps, search, rechargeLevelFilter, consumptionLevelFilter)
  }

  const openDetail = async (member) => {
    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      const [detailRes, rechargeCfgRes, consumptionCfgRes] = await Promise.all([
        getMemberDetail(member.id),
        getLevelConfig('recharge'),
        getLevelConfig('consumption'),
      ])
      setSelected(detailRes.data.data)
      setLevelConfigs({
        recharge: rechargeCfgRes.data.data || [],
        consumption: consumptionCfgRes.data.data || [],
      })
    } catch {
      message.error('获取会员详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const toNum = (v) => (typeof v === 'string' ? Number(v) : v)

  const columns = [
    {
      title: '会员', key: 'member', width: 180,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={38} style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', color: '#1A1208', fontWeight: 700, fontSize: 16 }}>
            {(r.nickname || '?')[0]}
          </Avatar>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{r.nickname}</div>
            <div style={{ fontSize: 11, color: '#6B6560' }}>加入 {r.joinDate}</div>
          </div>
        </div>
      ),
    },
    {
      title: '充值等级', key: 'rechargeLevel', width: 110,
      render: (_, r) => <MemberLevelBadge type="recharge" level={r.rechargeLevel} />,
      sorter: (a, b) => a.rechargeLevel - b.rechargeLevel,
    },
    {
      title: '消费等级', key: 'consumptionLevel', width: 110,
      render: (_, r) => <MemberLevelBadge type="consumption" level={r.consumptionLevel} />,
      sorter: (a, b) => a.consumptionLevel - b.consumptionLevel,
    },
    {
      title: '储值余额', dataIndex: 'balance', key: 'balance', width: 110,
      render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{(v || 0).toLocaleString()}</span>,
      sorter: (a, b) => (a.balance || 0) - (b.balance || 0),
    },
    {
      title: '累计充值', dataIndex: 'totalRecharge', key: 'totalRecharge', width: 110,
      render: v => <span style={{ color: '#E8C97A' }}>¥{(v || 0).toLocaleString()}</span>,
      sorter: (a, b) => (a.totalRecharge || 0) - (b.totalRecharge || 0),
    },
    {
      title: '累计消费', dataIndex: 'totalSpend', key: 'totalSpend', width: 110,
      render: v => <span style={{ color: '#F5F0E8' }}>¥{(v || 0).toLocaleString()}</span>,
      sorter: (a, b) => (a.totalSpend || 0) - (b.totalSpend || 0),
    },
    { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 70, render: v => <span style={{ color: '#9E9484' }}>{v || 0}</span>, sorter: (a, b) => (a.orderCount || 0) - (b.orderCount || 0) },
    { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 130, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '操作', key: 'action', width: 70, fixed: 'right',
      render: (_, r) => <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#C9A84C' }} onClick={() => openDetail(r)} />,
    },
  ]

  const rechargeStatus = (status) => {
    const map = { success: 'success', failed: 'danger', pending: 'warning' }
    return map[status] || 'default'
  }

  const orderStatusMap = {
    completed: { type: 'success', label: '已完成' },
    pending: { type: 'warning', label: '待支付' },
    cancelled: { type: 'danger', label: '已取消' },
    settling: { type: 'gold', label: '待结算' },
  }

  const syncStatusMap = {
    synced: { type: 'success', label: '已同步' },
    not_synced: { type: 'warning', label: '未同步' },
    not_required: { type: 'default', label: '无需同步' },
    failed_retry: { type: 'danger', label: '同步异常' },
    out_of_sync: { type: 'danger', label: '数据不一致' },
  }

  function calcNextLevelGap(points, config) {
    if (!config || config.length === 0) return null
    const pt = toNum(points)
    const current = config.find(l => pt >= toNum(l.minPoints) && (l.maxPoints === null || l.maxPoints === undefined || pt <= toNum(l.maxPoints)))
    if (!current || current.maxPoints === null || current.maxPoints === undefined) return null
    return toNum(current.maxPoints) - pt + 1
  }

  function DetailContent({ member }) {
    if (detailLoading) {
      return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
    }
    if (!member) return null

    const nextRechargeGap = member.nextRechargeGap !== undefined ? member.nextRechargeGap
      : calcNextLevelGap(member.rechargePoints, levelConfigs.recharge)
    const nextConsumptionGap = member.nextConsumptionGap !== undefined ? member.nextConsumptionGap
      : calcNextLevelGap(member.consumptionPoints, levelConfigs.consumption)

    const rechargePts = toNum(member.rechargePoints)
    const consumptionPts = toNum(member.consumptionPoints)

    const tabItems = [
      {
        key: 'info',
        label: '基本信息',
        children: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#1F1F1F', borderRadius: 12 }}>
              <Avatar size={56} style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', color: '#1A1208', fontWeight: 700, fontSize: 22 }}>
                {(member.nickname || '?')[0]}
              </Avatar>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#F5F0E8', fontWeight: 700, fontSize: 16 }}>{member.nickname}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <MemberLevelBadge type="recharge" level={member.rechargeLevel} />
                  <MemberLevelBadge type="consumption" level={member.consumptionLevel} />
                </div>
                <div style={{ color: '#6B6560', fontSize: 12, marginTop: 4 }}>加入时间：{member.joinDate}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: '储值余额', value: `¥${(member.balance || 0).toLocaleString()}`, color: '#C9A84C' },
                { label: '累计充值', value: `¥${(member.totalRecharge || 0).toLocaleString()}`, color: '#E8C97A' },
                { label: '累计消费', value: `¥${(member.totalSpend || 0).toLocaleString()}`, color: '#F5F0E8' },
                { label: '订单数', value: member.orderCount || 0, color: '#F5F0E8' },
              ].map(item => (
                <div key={item.label} style={{ background: '#1F1F1F', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: item.color }}>{item.value}</div>
                </div>
              ))}
              {[
                { label: '生日', value: member.birthday || '未填写', color: '#9E9484' },
                { label: '手机号', value: member.phoneMask || member.phone || '未绑定', color: '#9E9484' },
              ].map(item => (
                <div key={item.label} style={{ background: '#1F1F1F', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '8px 0 16px' }} />
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>等级详情</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: '14px' }}>
                <div style={{ fontSize: 12, color: '#9E9484', marginBottom: 6 }}>充值等级积分</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A84C' }}>{rechargePts.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#6B6560', marginTop: 4 }}>
                  {nextRechargeGap !== null && nextRechargeGap !== undefined
                    ? `距离 V${(member.rechargeLevel || 0) + 1} 还差 ${nextRechargeGap.toLocaleString()} 积分`
                    : `已达到最高等级 V${member.rechargeLevel}`}
                </div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(184,149,106,0.08), rgba(184,149,106,0.02))', border: '1px solid rgba(184,149,106,0.15)', borderRadius: 10, padding: '14px' }}>
                <div style={{ fontSize: 12, color: '#9E9484', marginBottom: 6 }}>消费等级积分</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#B8956A' }}>{consumptionPts.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#6B6560', marginTop: 4 }}>
                  {nextConsumptionGap !== null && nextConsumptionGap !== undefined
                    ? `距离 V${(member.consumptionLevel || 0) + 1} 还差 ${nextConsumptionGap.toLocaleString()} 积分`
                    : `已达到最高等级 V${member.consumptionLevel}`}
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'recharge',
        label: '充值记录',
        children: !member.rechargeRecords || member.rechargeRecords.length === 0 ? (
          <div style={{ color: '#4A4540', textAlign: 'center', padding: 40 }}>暂无充值记录</div>
        ) : (
          <Table
            dataSource={member.rechargeRecords}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '充值单号', dataIndex: 'orderNo', key: 'orderNo', width: 130, render: v => <span style={{ color: '#C9A84C', fontSize: 12 }}>{v}</span> },
              { title: '金额', dataIndex: 'amount', key: 'amount', width: 80, render: v => <span style={{ color: '#4CAF7A', fontWeight: 600 }}>¥{(v || 0).toLocaleString()}</span> },
              { title: '方式', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 70, render: v => <span style={{ color: '#9E9484', fontSize: 11 }}>{v || '-'}</span> },
              { title: '积分+', dataIndex: 'pointsAdded', key: 'pointsAdded', width: 65, render: v => <span style={{ color: '#C9A84C', fontSize: 12 }}>+{v || 0}</span> },
              {
                title: '状态', dataIndex: 'status', key: 'status', width: 55,
                render: v => <StatusBadge type={rechargeStatus(v)} dot>{v === 'success' ? '成功' : v === 'failed' ? '失败' : '处理中'}</StatusBadge>,
              },
              { title: '时间', dataIndex: 'time', key: 'time', width: 130, render: v => <span style={{ color: '#6B6560', fontSize: 11 }}>{v || '-'}</span> },
            ]}
          />
        ),
      },
      {
        key: 'consumption',
        label: '消费记录',
        children: !member.consumptionRecords || member.consumptionRecords.length === 0 ? (
          <div style={{ color: '#4A4540', textAlign: 'center', padding: 40 }}>暂无消费记录</div>
        ) : (
          <Table
            dataSource={member.consumptionRecords}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo', width: 130, render: v => <span style={{ color: '#C9A84C', fontSize: 12 }}>{v}</span> },
              { title: '商品', dataIndex: 'productInfo', key: 'productInfo', width: 120, render: v => <span style={{ color: '#F5F0E8', fontSize: 11 }}>{v || '-'}</span> },
              { title: '金额', dataIndex: 'amount', key: 'amount', width: 70, render: v => <span style={{ color: '#C94C4C', fontWeight: 600 }}>¥{(v || 0).toLocaleString()}</span> },
              { title: '支付方式', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 70, render: v => <span style={{ color: '#9E9484', fontSize: 11 }}>{v || '-'}</span> },
              {
                title: '订单状态', dataIndex: 'orderStatus', key: 'orderStatus', width: 65,
                render: v => {
                  const s = orderStatusMap[v] || { type: 'default', label: v }
                  return <StatusBadge type={s.type} dot>{s.label}</StatusBadge>
                },
              },
              {
                title: '同步', dataIndex: 'syncStatus', key: 'syncStatus', width: 60,
                render: v => {
                  const s = syncStatusMap[v] || { type: 'default', label: v || '未知' }
                  return <StatusBadge type={s.type} dot>{s.label}</StatusBadge>
                },
              },
              { title: '时间', dataIndex: 'time', key: 'time', width: 130, render: v => <span style={{ color: '#6B6560', fontSize: 11 }}>{v || '-'}</span> },
            ]}
          />
        ),
      },
      {
        key: 'levelChanges',
        label: '等级变更',
        children: !member.levelChangeRecords || member.levelChangeRecords.length === 0 ? (
          <div style={{ color: '#4A4540', textAlign: 'center', padding: 40 }}>暂无变更记录</div>
        ) : (
          <Table
            dataSource={member.levelChangeRecords}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: '类型', dataIndex: 'levelType', key: 'levelType', width: 65,
                render: v => <MemberLevelBadge type={v} level={1} showIcon={false} size="small" />,
              },
              {
                title: '变更', key: 'change', width: 85,
                render: (_, r) => (
                  <span style={{ fontSize: 11, color: '#9E9484' }}>
                    <span style={{ color: '#6B6560' }}>V{r.levelBefore}</span> → <span style={{ color: '#C9A84C', fontWeight: 600 }}>V{r.levelAfter}</span>
                  </span>
                ),
              },
              { title: '触发方式', dataIndex: 'triggerType', key: 'triggerType', width: 75, render: v => <span style={{ color: '#9E9484', fontSize: 11 }}>{v || '-'}</span> },
              { title: '关联单号', dataIndex: 'triggerOrderNo', key: 'triggerOrderNo', width: 130, render: v => <span style={{ color: '#C9A84C', fontSize: 11 }}>{v || '-'}</span> },
              { title: '时间', dataIndex: 'time', key: 'time', width: 130, render: v => <span style={{ color: '#6B6560', fontSize: 11 }}>{v || '-'}</span> },
            ]}
          />
        ),
      },
    ]

    return <Tabs items={tabItems} />
  }

  return (
    <div>
      <PageHeader title="用户/会员管理" subtitle="查看会员列表、双等级信息、充值/消费/等级变更明细" />

      {/* 总览统计 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: '全部会员', value: stats.totalMembers, color: '#F5F0E8' },
          { label: '高等级 (V7-V9)', value: stats.highLevel, color: '#C9A84C' },
          { label: '中等级 (V4-V6)', value: stats.midLevel, color: '#9E9484' },
          { label: '入门 (V1-V3)', value: stats.lowLevel, color: '#6B6560' },
        ].map(item => (
          <div
            key={item.label}
            style={{
              flex: 1, background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 10,
              padding: '14px 16px', textAlign: 'center', cursor: 'default',
              transition: 'border-color 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 12, color: '#6B6560', marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索会员昵称" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} allowClear />
        <Select placeholder="充值等级" value={rechargeLevelFilter} onChange={setRechargeLevelFilter} allowClear style={{ width: 120 }}>
          {rechargeLevels.map(l => <Option key={`r${l}`} value={l}>V{l}</Option>)}
        </Select>
        <Select placeholder="消费等级" value={consumptionLevelFilter} onChange={setConsumptionLevelFilter} allowClear style={{ width: 120 }}>
          {rechargeLevels.map(l => <Option key={`c${l}`} value={l}>V{l}</Option>)}
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {total} 位</span>
      </div>

      {/* 会员表格 */}
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table
          dataSource={members}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (t) => `共 ${t} 位会员`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1100 }}
        />
      </div>

      {/* 详情抽屉 */}
      <Drawer
        title={
          <span style={{ color: '#F5F0E8' }}>
            <UserOutlined style={{ marginRight: 8, color: '#C9A84C' }} />
            会员详情 · {selected?.nickname || ''}
          </span>
        }
        placement="right"
        width={620}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null) }}
      >
        {selected && <DetailContent member={selected} />}
      </Drawer>
    </div>
  )
}
