import { useState } from 'react'
import { Tabs, Table, Button, InputNumber, Switch, Form, Input, Modal, message, Divider, Popconfirm, Select, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { mockRechargeTiers, mockStoredValueConfig, mockTransactions } from '../../mock/storedvalue'
import { mockRechargeLevelConfigs, mockConsumptionLevelConfigs } from '../../mock/members'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import MemberLevelBadge from '../../components/MemberLevelBadge'

const { Option } = Select

export default function StoredValue() {
  const [tiers, setTiers] = useState(mockRechargeTiers)
  const [config, setConfig] = useState(mockStoredValueConfig)
  const [transactions] = useState(mockTransactions)
  const [rechargeLevels, setRechargeLevels] = useState(mockRechargeLevelConfigs)
  const [consumptionLevels, setConsumptionLevels] = useState(mockConsumptionLevelConfigs)
  const [tierModalOpen, setTierModalOpen] = useState(false)
  const [editingTier, setEditingTier] = useState(null)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [levelModalOpen, setLevelModalOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState(null)
  const [editingLevelType, setEditingLevelType] = useState('recharge')
  const [tierForm] = Form.useForm()
  const [adjustForm] = Form.useForm()
  const [levelForm] = Form.useForm()

  // === 充值档位 ===
  const openAddTier = () => { setEditingTier(null); tierForm.resetFields(); setTierModalOpen(true) }
  const openEditTier = (r) => { setEditingTier(r); tierForm.setFieldsValue(r); setTierModalOpen(true) }
  const saveTier = async () => {
    const vals = await tierForm.validateFields()
    const label = vals.bonus > 0 ? `¥${vals.amount} 送¥${vals.bonus}` : `¥${vals.amount}`
    if (editingTier) {
      setTiers(t => t.map(item => item.id === editingTier.id ? { ...item, ...vals, label } : item))
      message.success('档位已更新')
    } else {
      setTiers(t => [...t, { ...vals, id: Date.now(), label, active: true }])
      message.success('新档位已添加')
    }
    setTierModalOpen(false)
  }

  const handleAdjust = async () => {
    const vals = await adjustForm.validateFields()
    message.success(`已手动调整 ${vals.memberName} 余额 ${vals.type === 'add' ? '+' : '-'}¥${vals.amount}，原因：${vals.reason}`)
    adjustForm.resetFields()
    setAdjustModalOpen(false)
  }

  // === 等级配置 ===
  const openLevelEdit = (record, type) => {
    setEditingLevel(record)
    setEditingLevelType(type)
    levelForm.setFieldsValue({
      name: record.name,
      minPoints: record.minPoints,
      maxPoints: record.maxPoints,
      enabled: record.enabled,
    })
    setLevelModalOpen(true)
  }

  const saveLevelConfig = async () => {
    const vals = await levelForm.validateFields()
    const setter = editingLevelType === 'recharge' ? setRechargeLevels : setConsumptionLevels
    setter(prev => prev.map(item =>
      item.level === editingLevel.level
        ? { ...item, name: vals.name, minPoints: vals.minPoints, maxPoints: vals.maxPoints ?? null, enabled: vals.enabled }
        : item
    ))
    const typeLabel = editingLevelType === 'recharge' ? '充值等级' : '消费等级'
    message.success(`${typeLabel} V${editingLevel.level} 配置已更新`)
    setLevelModalOpen(false)
  }

  const handleRecalculate = () => {
    message.success('已触发全部用户等级重新计算，结果将记录至等级变更日志')
  }

  const tierColumns = [
    { title: '档位名称', dataIndex: 'label', key: 'label', render: v => <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{v}</span> },
    { title: '充值金额(¥)', dataIndex: 'amount', key: 'amount', render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v.toLocaleString()}</span> },
    { title: '赠送金额(¥)', dataIndex: 'bonus', key: 'bonus', render: v => <span style={{ color: '#4CAF7A' }}>{v > 0 ? `+¥${v}` : '无'}</span> },
    {
      title: '启用', key: 'active', width: 80,
      render: (_, r) => <Switch size="small" checked={r.active} onChange={checked => setTiers(t => t.map(item => item.id === r.id ? { ...item, active: checked } : item))} />,
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <span style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEditTier(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => { setTiers(t => t.filter(item => item.id !== r.id)); message.success('已删除') }} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  const transColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 160, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    { title: '会员', dataIndex: 'userName', key: 'userName', render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: v => <StatusBadge type={v === 'recharge' ? 'success' : v === 'adjust' ? 'warning' : 'danger'}>{v === 'recharge' ? '充值' : v === 'adjust' ? '调整' : '消费'}</StatusBadge>,
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 100,
      render: v => <span style={{ color: v > 0 ? '#4CAF7A' : '#C94C4C', fontWeight: 600 }}>{v > 0 ? '+' : ''}¥{Math.abs(v).toLocaleString()}</span>,
    },
    { title: '余额', dataIndex: 'balance', key: 'balance', width: 100, render: v => <span style={{ color: '#C9A84C' }}>¥{v.toLocaleString()}</span> },
    { title: '描述', dataIndex: 'desc', key: 'desc', render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span> },
  ]

  function makeLevelColumns(type) {
    const isRecharge = type === 'recharge'
    const data = isRecharge ? rechargeLevels : consumptionLevels
    return [
      {
        title: '等级', key: 'level', width: 80,
        render: (_, r) => <MemberLevelBadge type={type} level={r.level} />,
      },
      {
        title: '等级名称', dataIndex: 'name', key: 'name', width: 90,
        render: (v, r) => <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{v || `V${r.level}`}</span>,
      },
      {
        title: '积分区间', key: 'range', width: 200,
        render: (_, r) => (
          <span style={{ color: '#9E9484', fontSize: 13 }}>
            {r.minPoints.toLocaleString()} {r.maxPoints !== null ? `- ${r.maxPoints.toLocaleString()}` : '及以上（无上限）'}
          </span>
        ),
      },
      {
        title: '图标', key: 'icon', width: 80,
        render: () => <span style={{ fontSize: 16 }}>{isRecharge ? '👑' : '🔶'}</span>,
      },
      {
        title: '启用', key: 'enabled', width: 70,
        render: (_, r) => (
          <Switch
            size="small"
            checked={r.enabled}
            onChange={checked => {
              const setter = isRecharge ? setRechargeLevels : setConsumptionLevels
              setter(prev => prev.map(item => item.level === r.level ? { ...item, enabled: checked } : item))
            }}
          />
        ),
      },
      {
        title: '操作', key: 'action', width: 70,
        render: (_, r) => (
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openLevelEdit(r, type)} />
        ),
      },
    ]
  }

  const tabItems = [
    {
      key: 'tiers', label: '充值档位',
      children: (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddTier}
              style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
              添加档位
            </Button>
          </div>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
            <Table dataSource={tiers} columns={tierColumns} rowKey="id" pagination={false} size="middle" />
          </div>
        </div>
      ),
    },
    {
      key: 'config', label: '折扣与提醒',
      children: (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 8 }}>储值会员折扣率</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <InputNumber min={0.5} max={1} step={0.01} value={config.discountRate}
                  onChange={v => setConfig(c => ({ ...c, discountRate: v }))}
                  style={{ width: 120 }} />
                <span style={{ color: '#C9A84C', fontSize: 18, fontWeight: 700 }}>{Math.round(config.discountRate * 10)}折</span>
              </div>
              <div style={{ color: '#6B6560', fontSize: 12, marginTop: 4 }}>下单时自动按折扣计算，全页面展示储值价</div>
            </div>
            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)' }} />
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 8 }}>生日提醒提前天数</div>
              <InputNumber min={1} max={30} value={config.birthdayReminderDays}
                onChange={v => setConfig(c => ({ ...c, birthdayReminderDays: v }))}
                style={{ width: 120 }} addonAfter="天" />
            </div>
            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#9E9484', fontSize: 13 }}>商品上新全员推送</div>
                <div style={{ color: '#6B6560', fontSize: 12 }}>新品上架时自动推送会员通知</div>
              </div>
              <Switch checked={config.newArrivalNotify} onChange={v => setConfig(c => ({ ...c, newArrivalNotify: v }))} />
            </div>
            <Button type="primary" block style={{ marginTop: 24, background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
              onClick={() => message.success('配置已保存')}>
              保存配置
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'transactions', label: '流水记录',
      children: (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <Button icon={<WalletOutlined />} style={{ color: '#E8A04C', borderColor: 'rgba(232,160,76,0.3)' }} onClick={() => setAdjustModalOpen(true)}>
              手动调整余额
            </Button>
          </div>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
            <Table dataSource={transactions} columns={transColumns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
          </div>
        </div>
      ),
    },
    {
      key: 'levels', label: '等级配置',
      children: (
        <div>
          <Alert
            message="等级区间修改后，建议执行「重新计算全部用户等级」以确保所有会员等级与最新规则一致。V1 必须从 0 开始，V9 可设为无上限。区间不得重叠或断档。"
            type="info"
            showIcon
            style={{ marginBottom: 16, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8 }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button
              icon={<ReloadOutlined />}
              style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
              onClick={handleRecalculate}
            >
              重新计算全部用户等级
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 充值等级配置 */}
            <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MemberLevelBadge type="recharge" level={1} showIcon={true} />
                <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14 }}>充值等级配置</span>
                <span style={{ color: '#6B6560', fontSize: 12 }}>（按累计充值金额）</span>
              </div>
              <Table
                dataSource={rechargeLevels}
                columns={makeLevelColumns('recharge')}
                rowKey="level"
                pagination={false}
                size="small"
                showHeader={false}
              />
            </div>

            {/* 消费等级配置 */}
            <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MemberLevelBadge type="consumption" level={1} showIcon={true} />
                <span style={{ color: '#B8956A', fontWeight: 700, fontSize: 14 }}>消费等级配置</span>
                <span style={{ color: '#6B6560', fontSize: 12 }}>（按累计消费金额）</span>
              </div>
              <Table
                dataSource={consumptionLevels}
                columns={makeLevelColumns('consumption')}
                rowKey="level"
                pagination={false}
                size="small"
                showHeader={false}
              />
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="储值管理" subtitle="配置充值档位、折扣规则、等级体系及查看流水" />

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} />
      </div>

      {/* 充值档位弹窗 */}
      <Modal title={editingTier ? '编辑充值档位' : '新增充值档位'} open={tierModalOpen} onCancel={() => setTierModalOpen(false)} onOk={saveTier} okText="保存" cancelText="取消"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={tierForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="amount" label="充值金额(¥)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="bonus" label="赠送金额(¥)" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      {/* 手动调整余额弹窗 */}
      <Modal title="手动调整会员余额" open={adjustModalOpen} onCancel={() => setAdjustModalOpen(false)} onOk={handleAdjust} okText="确认调整" cancelText="取消"
        okButtonProps={{ style: { background: 'rgba(232,160,76,0.8)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={adjustForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="memberName" label="会员昵称" rules={[{ required: true }]}><Input placeholder="输入会员昵称" /></Form.Item>
          <Form.Item name="type" label="调整方式" rules={[{ required: true }]}>
            <select style={{ width: '100%', padding: '6px 10px', background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, color: '#F5F0E8' }}>
              <option value="add">增加余额</option>
              <option value="sub">减少余额</option>
            </select>
          </Form.Item>
          <Form.Item name="amount" label="调整金额(¥)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reason" label="调整原因" rules={[{ required: true }]}><Input placeholder="例：系统补偿" /></Form.Item>
        </Form>
      </Modal>

      {/* 等级配置编辑弹窗 */}
      <Modal
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8, color: '#C9A84C' }} />
            编辑{editingLevelType === 'recharge' ? '充值' : '消费'}等级 · V{editingLevel?.level}
          </span>
        }
        open={levelModalOpen}
        onCancel={() => setLevelModalOpen(false)}
        onOk={saveLevelConfig}
        okText="保存配置"
        cancelText="取消"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={levelForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="等级名称" rules={[{ required: true }]}>
            <Input placeholder="如：V8 尊享会员" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="minPoints" label="积分下限" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxPoints" label="积分上限" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="留空 = 无上限" />
            </Form.Item>
          </div>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
        {editingLevel?.level === 9 && (
          <Alert message="V9 建议设为无上限（积分上限留空），表示最高等级。" type="warning" showIcon style={{ marginTop: 8, background: 'rgba(232,160,76,0.06)', border: '1px solid rgba(232,160,76,0.2)' }} />
        )}
      </Modal>
    </div>
  )
}
