import { useState } from 'react'
import { Table, Button, Input, Select, Avatar, Tabs, Drawer, Divider, message } from 'antd'
import { SearchOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons'
import { mockMembers, memberLevelMap } from '../../mock/members'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'

const { Option } = Select

const levelColorMap = { normal: 'default', silver: 'silver', gold: 'gold' }

export default function Members() {
  const [data] = useState(mockMembers)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const filtered = data.filter(m =>
    (!search || m.nickname.includes(search)) &&
    (!levelFilter || m.level === levelFilter)
  )

  const openDetail = (r) => { setSelected(r); setDrawerOpen(true) }

  const columns = [
    {
      title: '会员', key: 'member', width: 180,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={38} style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', color: '#1A1208', fontWeight: 700, fontSize: 16 }}>
            {r.nickname[0]}
          </Avatar>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{r.nickname}</div>
            <div style={{ fontSize: 11, color: '#6B6560' }}>加入 {r.joinDate}</div>
          </div>
        </div>
      ),
    },
    {
      title: '等级', dataIndex: 'level', key: 'level', width: 110,
      render: v => <StatusBadge type={levelColorMap[v]}>{memberLevelMap[v]?.label}</StatusBadge>,
    },
    {
      title: '储值余额', dataIndex: 'balance', key: 'balance', width: 110,
      render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v.toLocaleString()}</span>,
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: '累计消费', dataIndex: 'totalSpend', key: 'totalSpend', width: 110,
      render: v => <span style={{ color: '#F5F0E8' }}>¥{v.toLocaleString()}</span>,
      sorter: (a, b) => a.totalSpend - b.totalSpend,
    },
    { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80, render: v => <span style={{ color: '#9E9484' }}>{v}</span>, sorter: (a, b) => a.orderCount - b.orderCount },
    { title: '最后登录', dataIndex: 'lastLogin', key: 'lastLogin', width: 110, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    {
      title: '操作', key: 'action', width: 80,
      render: (_, r) => <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#C9A84C' }} onClick={() => openDetail(r)} />,
    },
  ]

  const transTypeMap = {
    recharge: { label: '充值', color: '#4CAF7A', prefix: '+' },
    consume: { label: '消费', color: '#C94C4C', prefix: '' },
    adjust: { label: '调整', color: '#E8A04C', prefix: '+' },
  }

  return (
    <div>
      <PageHeader title="用户/会员管理" subtitle="查看会员列表、储值明细及消费记录" />

      {/* 总览 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: '全部会员', value: data.length, color: '#F5F0E8' },
          { label: '金卡会员', value: data.filter(m => m.level === 'gold').length, color: '#C9A84C' },
          { label: '银卡会员', value: data.filter(m => m.level === 'silver').length, color: '#A0A0B0' },
          { label: '普通会员', value: data.filter(m => m.level === 'normal').length, color: '#9E9484' },
        ].map(item => (
          <div key={item.label} style={{ flex: 1, background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 12, color: '#6B6560', marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索会员昵称" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <Select placeholder="全部等级" value={levelFilter || undefined} onChange={setLevelFilter} allowClear style={{ width: 130 }}>
          <Option value="gold">金卡会员</Option>
          <Option value="silver">银卡会员</Option>
          <Option value="normal">普通会员</Option>
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {filtered.length} 位</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
      </div>

      <Drawer title={`会员详情 · ${selected?.nickname || ''}`} placement="right" width={520} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selected && (
          <div>
            {/* 基本信息 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#1F1F1F', borderRadius: 12 }}>
              <Avatar size={56} style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', color: '#1A1208', fontWeight: 700, fontSize: 22 }}>
                {selected.nickname[0]}
              </Avatar>
              <div>
                <div style={{ color: '#F5F0E8', fontWeight: 700, fontSize: 16 }}>{selected.nickname}</div>
                <StatusBadge type={levelColorMap[selected.level]}>{memberLevelMap[selected.level]?.label}</StatusBadge>
                <div style={{ color: '#6B6560', fontSize: 12, marginTop: 4 }}>加入时间：{selected.joinDate}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: '储值余额', value: `¥${selected.balance.toLocaleString()}`, color: '#C9A84C' },
                { label: '累计消费', value: `¥${selected.totalSpend.toLocaleString()}`, color: '#F5F0E8' },
                { label: '订单数', value: selected.orderCount, color: '#F5F0E8' },
                { label: '生日', value: selected.birthday || '未填写', color: '#9E9484' },
              ].map(item => (
                <div key={item.label} style={{ background: '#1F1F1F', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '8px 0 16px' }} />
            <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 12 }}>储值流水记录</div>
            {selected.records.length === 0 ? (
              <div style={{ color: '#4A4540', textAlign: 'center', padding: 24 }}>暂无记录</div>
            ) : selected.records.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div>
                  <div style={{ color: '#F5F0E8', fontSize: 13 }}>{r.desc}</div>
                  <div style={{ color: '#6B6560', fontSize: 11 }}>{r.time}</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color: transTypeMap[r.type]?.color }}>
                  {transTypeMap[r.type]?.prefix}{r.amount > 0 ? '+' : ''}¥{Math.abs(r.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
