import { useState, useEffect, useCallback } from 'react'
import { Tabs, Table, Button, InputNumber, Switch, Form, Input, Modal, message, Divider, Popconfirm, Select, Alert, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { getRechargeTiers, createRechargeTier, updateRechargeTier, deleteRechargeTier, getLevelConfigs, updateLevelConfig, recalculateLevels, getTransactions, adjustBalance } from '../../api/storedvalue'
import { getSettings, updateSetting } from '../../api/settings'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import MemberLevelBadge from '../../components/MemberLevelBadge'

export default function StoredValue() {
  // === Tab 1: 充值档位 ===
  const [tiers, setTiers] = useState([])
  const [tiersLoading, setTiersLoading] = useState(false)
  const [tierModalOpen, setTierModalOpen] = useState(false)
  const [editingTier, setEditingTier] = useState(null)
  const [tierSaving, setTierSaving] = useState(false)
  const [tierForm] = Form.useForm()

  // === Tab 2: 折扣与提醒 ===
  const [config, setConfig] = useState({ discountRate: 0.85, birthdayReminderDays: 3, newArrivalNotify: true })
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)

  // === Tab 3: 流水记录 ===
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustForm] = Form.useForm()

  // === Tab 4: 等级配置 ===
  const [rechargeLevels, setRechargeLevels] = useState([])
  const [consumptionLevels, setConsumptionLevels] = useState([])
  const [levelsLoading, setLevelsLoading] = useState(false)
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [levelModalOpen, setLevelModalOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState(null)
  const [editingLevelType, setEditingLevelType] = useState('recharge')
  const [levelSaving, setLevelSaving] = useState(false)
  const [levelForm] = Form.useForm()

  // === Fetch functions ===

  const fetchTiers = useCallback(async () => {
    setTiersLoading(true)
    try {
      const res = await getRechargeTiers()
      const data = res.data.data
      const list = Array.isArray(data) ? data : (data.list || [])
      setTiers(list.map(t => ({
        ...t,
        id: t.id.toString(),
        amount: parseFloat(t.amountYuan) || 0,
        bonus: parseFloat(t.bonusYuan) || 0,
        label: t.displayName || `¥${parseFloat(t.amountYuan) || 0}`,
        active: t.active !== undefined ? t.active : t.enabled !== undefined ? t.enabled : true,
      })))
    } catch {
      message.error('获取充值档位失败')
    } finally {
      setTiersLoading(false)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const res = await getSettings()
      const s = res.data.data
      const other = s?.other || {}
      setConfig({
        discountRate: parseFloat(other.discount_rate) || 0.85,
        birthdayReminderDays: parseInt(other.birthday_reminder_days, 10) || 3,
        newArrivalNotify: other.new_arrival_notify === 'true' || other.new_arrival_notify === true,
      })
    } catch {
      // use defaults
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true)
    try {
      const res = await getTransactions({ page, pageSize: 10 })
      const d = res.data.data
      setTransactions((d.list || []).map(tx => ({
        ...tx,
        id: tx.id.toString(),
        amount: parseFloat(tx.amountYuan) || 0,
        balance: parseFloat(tx.balanceAfterYuan) || 0,
        time: tx.createdAt || tx.time,
        desc: tx.description || '',
        userName: tx.userId || '',
      })))
      setTxTotal(d.total || 0)
      setTxPage(page)
    } catch {
      message.error('获取流水记录失败')
    } finally {
      setTxLoading(false)
    }
  }, [])

  const fetchLevelConfigs = useCallback(async () => {
    setLevelsLoading(true)
    try {
      const [rechargeRes, consumptionRes] = await Promise.all([
        getLevelConfigs('recharge'),
        getLevelConfigs('consumption'),
      ])
      const mapLevel = (item) => ({
        ...item,
        id: item.id.toString(),
        minPoints: typeof item.minPoints === 'string' ? Number(item.minPoints) : item.minPoints,
        maxPoints: item.maxPoints != null ? (typeof item.maxPoints === 'string' ? Number(item.maxPoints) : item.maxPoints) : null,
      })
      setRechargeLevels((rechargeRes.data.data || []).map(mapLevel))
      setConsumptionLevels((consumptionRes.data.data || []).map(mapLevel))
    } catch {
      message.error('获取等级配置失败')
    } finally {
      setLevelsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTiers()
    fetchConfig()
    fetchTransactions(1)
    fetchLevelConfigs()
  }, [])

  // === Tab 1: 充值档位 actions ===

  const openAddTier = () => {
    setEditingTier(null)
    tierForm.resetFields()
    setTierModalOpen(true)
  }

  const openEditTier = (r) => {
    setEditingTier(r)
    tierForm.setFieldsValue({ amount: r.amount, bonus: r.bonus })
    setTierModalOpen(true)
  }

  const saveTier = async () => {
    const vals = await tierForm.validateFields()
    setTierSaving(true)
    try {
      const payload = {
        amountCents: Math.round(vals.amount * 100),
        bonusCents: Math.round((vals.bonus || 0) * 100),
        displayName: vals.bonus > 0 ? `¥${vals.amount} 送¥${vals.bonus}` : `¥${vals.amount}`,
      }
      if (editingTier) {
        await updateRechargeTier(editingTier.id, payload)
        message.success('档位已更新')
      } else {
        await createRechargeTier(payload)
        message.success('新档位已添加')
      }
      setTierModalOpen(false)
      fetchTiers()
    } catch {
      message.error('保存档位失败')
    } finally {
      setTierSaving(false)
    }
  }

  const toggleTierActive = async (r, checked) => {
    try {
      await updateRechargeTier(r.id, { enabled: checked })
      setTiers(prev => prev.map(item => item.id === r.id ? { ...item, active: checked } : item))
    } catch {
      message.error('更新状态失败')
    }
  }

  const handleDeleteTier = async (r) => {
    try {
      await deleteRechargeTier(r.id)
      message.success('已删除')
      fetchTiers()
    } catch {
      message.error('删除失败')
    }
  }

  // === Tab 2: 折扣与提醒 actions ===

  const saveConfig = async () => {
    setConfigSaving(true)
    try {
      await Promise.all([
        updateSetting('discount_rate', { value: String(config.discountRate) }),
        updateSetting('birthday_reminder_days', { value: String(config.birthdayReminderDays) }),
        updateSetting('new_arrival_notify', { value: String(config.newArrivalNotify) }),
      ])
      message.success('配置已保存')
    } catch {
      message.error('保存配置失败')
    } finally {
      setConfigSaving(false)
    }
  }

  // === Tab 3: 流水记录 actions ===

  const handleAdjust = async () => {
    const vals = await adjustForm.validateFields()
    setAdjustSaving(true)
    try {
      const amountCents = vals.type === 'add'
        ? Math.round(vals.amount * 100)
        : -Math.round(vals.amount * 100)
      await adjustBalance({
        userId: Number(vals.userId),
        amountCents,
        reason: vals.reason,
      })
      message.success('余额调整成功')
      adjustForm.resetFields()
      setAdjustModalOpen(false)
      fetchTransactions(1)
    } catch (err) {
      message.error(err?.response?.data?.message || '调整失败')
    } finally {
      setAdjustSaving(false)
    }
  }

  // === Tab 4: 等级配置 actions ===

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
    setLevelSaving(true)
    try {
      await updateLevelConfig(editingLevel.id, {
        name: vals.name,
        minPoints: vals.minPoints,
        maxPoints: vals.maxPoints ?? null,
        enabled: vals.enabled,
      })
      const typeLabel = editingLevelType === 'recharge' ? '充值等级' : '消费等级'
      message.success(`${typeLabel} V${editingLevel.level} 配置已更新`)
      setLevelModalOpen(false)
      fetchLevelConfigs()
    } catch {
      message.error('保存等级配置失败')
    } finally {
      setLevelSaving(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalcLoading(true)
    try {
      await recalculateLevels('recharge')
      await recalculateLevels('consumption')
      message.success('已触发全部用户等级重新计算，结果将记录至等级变更日志')
    } catch {
      message.error('触发重算失败')
    } finally {
      setRecalcLoading(false)
    }
  }

  const toggleLevelEnabled = async (record, type, checked) => {
    try {
      await updateLevelConfig(record.id, { enabled: checked })
      const setter = type === 'recharge' ? setRechargeLevels : setConsumptionLevels
      setter(prev => prev.map(item => item.level === record.level ? { ...item, enabled: checked } : item))
    } catch {
      message.error('更新状态失败')
    }
  }

  // === Table columns ===

  const tierColumns = [
    { title: '档位名称', dataIndex: 'label', key: 'label', render: v => <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{v}</span> },
    { title: '充值金额(¥)', dataIndex: 'amount', key: 'amount', render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{(v || 0).toLocaleString()}</span> },
    { title: '赠送金额(¥)', dataIndex: 'bonus', key: 'bonus', render: v => <span style={{ color: '#4CAF7A' }}>{(v || 0) > 0 ? `+¥${v}` : '无'}</span> },
    {
      title: '启用', key: 'active', width: 80,
      render: (_, r) => <Switch size="small" checked={r.active} onChange={checked => toggleTierActive(r, checked)} />,
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <span style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEditTier(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteTier(r)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  const transColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 160, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v || '-'}</span> },
    { title: '用户ID', dataIndex: 'userName', key: 'userName', width: 80, render: v => <span style={{ color: '#F5F0E8', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: v => {
        const typeMap = { recharge: { type: 'success', label: '充值' }, consume: { type: 'danger', label: '消费' }, adjust: { type: 'warning', label: '调整' }, manual_credit: { type: 'success', label: '手动加款' }, manual_debit: { type: 'danger', label: '手动扣款' }, refund: { type: 'warning', label: '退款' } }
        const m = typeMap[v] || { type: 'default', label: v || '未知' }
        return <StatusBadge type={m.type}>{m.label}</StatusBadge>
      },
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 100,
      render: v => {
        const num = Number(v) || 0
        return <span style={{ color: num > 0 ? '#4CAF7A' : '#C94C4C', fontWeight: 600 }}>{num > 0 ? '+' : ''}¥{Math.abs(num).toLocaleString()}</span>
      },
    },
    { title: '余额', dataIndex: 'balance', key: 'balance', width: 100, render: v => <span style={{ color: '#C9A84C' }}>¥{(Number(v) || 0).toLocaleString()}</span> },
    { title: '描述', dataIndex: 'desc', key: 'desc', render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
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
            {(r.minPoints || 0).toLocaleString()} {r.maxPoints !== null && r.maxPoints !== undefined ? `- ${r.maxPoints.toLocaleString()}` : '及以上（无上限）'}
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
          <Switch size="small" checked={r.enabled} onChange={checked => toggleLevelEnabled(r, type, checked)} />
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
            <Table dataSource={tiers} columns={tierColumns} rowKey="id" pagination={false} size="middle" loading={tiersLoading} />
          </div>
        </div>
      ),
    },
    {
      key: 'config', label: '折扣与提醒',
      children: (
        <div style={{ maxWidth: 480 }}>
          {configLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
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
              <Button type="primary" block loading={configSaving} style={{ marginTop: 24, background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
                onClick={saveConfig}>
                保存配置
              </Button>
            </div>
          )}
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
            <Table
              dataSource={transactions}
              columns={transColumns}
              rowKey="id"
              size="middle"
              loading={txLoading}
              pagination={{
                current: txPage,
                pageSize: 10,
                total: txTotal,
                showTotal: (t) => `共 ${t} 条`,
                onChange: (p) => fetchTransactions(p),
              }}
            />
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
              loading={recalcLoading}
              style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
              onClick={handleRecalculate}
            >
              重新计算全部用户等级
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                loading={levelsLoading}
              />
            </div>

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
                loading={levelsLoading}
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
      <Modal
        title={editingTier ? '编辑充值档位' : '新增充值档位'}
        open={tierModalOpen}
        onCancel={() => setTierModalOpen(false)}
        onOk={saveTier}
        okText="保存"
        cancelText="取消"
        confirmLoading={tierSaving}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={tierForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="amount" label="充值金额(¥)" rules={[{ required: true, message: '请输入充值金额' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如：1000" />
          </Form.Item>
          <Form.Item name="bonus" label="赠送金额(¥)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="如：100" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 手动调整余额弹窗 */}
      <Modal
        title="手动调整会员余额"
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        onOk={handleAdjust}
        okText="确认调整"
        cancelText="取消"
        confirmLoading={adjustSaving}
        okButtonProps={{ style: { background: 'rgba(232,160,76,0.8)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={adjustForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="userId" label="用户ID" rules={[{ required: true, message: '请输入用户ID' }]}>
            <Input placeholder="输入用户数字ID" type="number" />
          </Form.Item>
          <Form.Item name="type" label="调整方式" rules={[{ required: true }]} initialValue="add">
            <select style={{ width: '100%', padding: '6px 10px', background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, color: '#F5F0E8' }}>
              <option value="add">增加余额</option>
              <option value="sub">减少余额</option>
            </select>
          </Form.Item>
          <Form.Item name="amount" label="调整金额(¥)" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="输入金额" />
          </Form.Item>
          <Form.Item name="reason" label="调整原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input placeholder="例：系统补偿" maxLength={255} />
          </Form.Item>
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
        confirmLoading={levelSaving}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={levelForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="等级名称" rules={[{ required: true, message: '请输入等级名称' }]}>
            <Input placeholder="如：V8 尊享会员" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="minPoints" label="积分下限" rules={[{ required: true, message: '请输入积分下限' }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxPoints" label="积分上限" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="留空 = 无上限" />
            </Form.Item>
          </div>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked" initialValue={true}>
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
