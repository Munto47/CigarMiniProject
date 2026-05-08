import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Switch, Tabs, message, Popconfirm, Avatar, Spin } from 'antd'
import { PlusOutlined, EditOutlined, UserOutlined, LockOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getAccounts, createAccount, updateAccount, deleteAccount, getLoginLogs } from '../../api/accounts'

const { Option } = Select

const roleMap = {
  super: { label: '超级管理员', color: '#C9A84C' },
  product: { label: '商品管理员', color: '#4CAF7A' },
  order: { label: '订单管理员', color: '#5B8DEE' },
  member: { label: '会员管理员', color: '#B8956A' },
}

const roleOptions = [
  { value: 'product', label: '商品管理员（管理商品/雪茄库）' },
  { value: 'order', label: '订单管理员（管理订单）' },
  { value: 'member', label: '会员管理员（管理会员/储值）' },
]

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [logData, setLogData] = useState([])
  const [logTotal, setLogTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logLoading, setLogLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const logPageSize = 10

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true)
    try {
      const res = await getAccounts({ page: 1, pageSize: 100 })
      const body = res.data.data
      setAccounts(body.list || [])
    } catch (err) {
      console.error('获取管理员列表失败:', err)
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLogLoading(true)
    try {
      const res = await getLoginLogs({ page: logPage, pageSize: logPageSize })
      const body = res.data.data
      setLogData(body.list || [])
      setLogTotal(body.total || 0)
    } catch (err) {
      console.error('获取登录日志失败:', err)
    } finally {
      setLogLoading(false)
    }
  }, [logPage])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const handleTabChange = (key) => {
    if (key === 'logs') fetchLogs()
  }

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    form.setFieldsValue({ name: r.name, username: r.username, roleCode: r.roleCode })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const vals = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        name: vals.name,
        username: vals.username,
        roleCode: vals.roleCode || vals.role,
      }
      if (!editing) payload.password = vals.password

      if (editing) {
        if (vals.password) payload.password = vals.password
        await updateAccount(editing.id, payload)
        message.success('账号信息已更新')
      } else {
        await createAccount(payload)
        message.success('管理员账号已创建')
      }
      setModalOpen(false)
      fetchAccounts()
    } catch (err) {
      message.error(err.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id, checked) => {
    try {
      await updateAccount(id, { status: checked ? 1 : 0 })
      message.success(checked ? '账号已启用' : '账号已禁用')
      fetchAccounts()
    } catch (err) {
      message.error(err.response?.data?.message || '状态更新失败')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAccount(id)
      message.success('已删除')
      fetchAccounts()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const accountColumns = [
    {
      title: '管理员', key: 'admin',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={36} style={{ background: r.roleCode === 'super' ? 'linear-gradient(135deg, #E8C97A, #C9A84C)' : '#1F1F1F', color: r.roleCode === 'super' ? '#1A1208' : '#9E9484', fontWeight: 700 }}>
            {(r.name || r.username || '?')[0]}
          </Avatar>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{r.name}</div>
            <div style={{ color: '#6B6560', fontSize: 12 }}>@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色', dataIndex: 'roleCode', key: 'roleCode', width: 130,
      render: v => {
        const info = roleMap[v] || { label: v, color: '#9E9484' }
        return <span style={{ fontSize: 12, color: info.color, background: `${info.color}18`, padding: '2px 10px', borderRadius: 999, border: `1px solid ${info.color}30` }}>{info.label}</span>
      },
    },
    {
      title: '状态', key: 'status', width: 110,
      render: (_, r) => (
        r.roleCode === 'super' ? <StatusBadge type="gold">超级管理员</StatusBadge> :
        <Switch size="small" checked={r.status === 1 || r.status === 'active'} onChange={checked => handleToggle(r.id, checked)} checkedChildren="启用" unCheckedChildren="禁用" />
      ),
    },
    { title: '最后登录', key: 'lastLogin', width: 160, render: (_, r) => <span style={{ color: '#6B6560', fontSize: 12 }}>{r.lastLoginAt || '-'}</span> },
    { title: '创建时间', key: 'createdAt', width: 110, render: (_, r) => <span style={{ color: '#6B6560', fontSize: 12 }}>{r.createdAt ? r.createdAt.slice(0, 10) : '-'}</span> },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        r.roleCode === 'super' ? <span style={{ color: '#4A4540', fontSize: 12 }}>不可修改</span> :
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除该账号？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" style={{ color: '#C94C4C', fontSize: 12 }}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const logColumns = [
    { title: '时间', key: 'time', width: 170, render: (_, r) => <span style={{ color: '#6B6560', fontSize: 12 }}>{r.createdAt || '-'}</span> },
    { title: '账号', dataIndex: 'username', key: 'username', render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
    { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 140, render: (_, r) => <span style={{ color: '#9E9484', fontFamily: 'monospace', fontSize: 12 }}>{r.ip || r.lastLoginIp || '-'}</span> },
    {
      title: '结果', dataIndex: 'result', key: 'result', width: 90,
      render: v => <StatusBadge type={v === 'success' ? 'success' : 'danger'} dot>{v === 'success' ? '成功' : '失败'}</StatusBadge>,
    },
  ]

  const tabItems = [
    {
      key: 'accounts', label: '管理员列表',
      children: (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
              style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
              新增管理员
            </Button>
          </div>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
            <Spin spinning={accountsLoading}>
              <Table dataSource={accounts} columns={accountColumns} rowKey="id" size="middle" pagination={false} />
            </Spin>
          </div>
        </div>
      ),
    },
    {
      key: 'logs', label: '登录日志',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Spin spinning={logLoading}>
            <Table
              dataSource={logData} columns={logColumns} rowKey="id" size="middle"
              pagination={{
                current: logPage, pageSize: logPageSize, total: logTotal,
                showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
                onChange: (p) => setLogPage(p),
              }}
            />
          </Spin>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="账号管理" subtitle="管理后台管理员账号与权限分配" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} onChange={handleTabChange} />
      </div>

      <Modal title={editing ? '编辑管理员' : '新增管理员'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消" confirmLoading={saving}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input prefix={<UserOutlined style={{ color: '#4A4540' }} />} /></Form.Item>
          <Form.Item name="username" label="登录账号" rules={[{ required: true }]}><Input prefix={<span style={{ color: '#4A4540' }}>@</span>} /></Form.Item>
          <Form.Item name="password" label={editing ? '新密码（留空不修改）' : '初始密码'} rules={editing ? [] : [{ required: true, min: 8, message: '至少8位，含大小写字母和数字' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#4A4540' }} />} placeholder={editing ? '留空则不修改密码' : '至少8位，含大小写字母和数字'} />
          </Form.Item>
          <Form.Item name="roleCode" label="角色权限" rules={[{ required: true }]}>
            <Select>{roleOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}</Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
