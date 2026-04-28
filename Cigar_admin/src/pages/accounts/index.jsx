import { useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Switch, Tabs, message, Popconfirm, Avatar, Tag } from 'antd'
import { PlusOutlined, EditOutlined, UserOutlined, LockOutlined } from '@ant-design/icons'
import { mockAccounts, mockLoginLogs, roleMap } from '../../mock/accounts'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'

const { Option } = Select

export default function Accounts() {
  const [accounts, setAccounts] = useState(mockAccounts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSave = async () => {
    const vals = await form.validateFields()
    if (editing) {
      setAccounts(a => a.map(item => item.id === editing.id ? { ...item, ...vals } : item))
      message.success('账号信息已更新')
    } else {
      setAccounts(a => [...a, { ...vals, id: Date.now(), status: 'active', lastLogin: '-', createdAt: new Date().toISOString().slice(0, 10) }])
      message.success('管理员账号已创建')
    }
    setModalOpen(false)
  }

  const handleToggle = (id, checked) => {
    setAccounts(a => a.map(item => item.id === id ? { ...item, status: checked ? 'active' : 'disabled' } : item))
    message.success(checked ? '账号已启用' : '账号已禁用')
  }

  const accountColumns = [
    {
      title: '管理员', key: 'admin',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={36} style={{ background: r.role === 'super' ? 'linear-gradient(135deg, #E8C97A, #C9A84C)' : '#1F1F1F', color: r.role === 'super' ? '#1A1208' : '#9E9484', fontWeight: 700 }}>
            {r.name[0]}
          </Avatar>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{r.name}</div>
            <div style={{ color: '#6B6560', fontSize: 12 }}>@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 130,
      render: v => {
        const info = roleMap[v] || {}
        return <span style={{ fontSize: 12, color: info.color, background: `${info.color}18`, padding: '2px 10px', borderRadius: 999, border: `1px solid ${info.color}30` }}>{info.label}</span>
      },
    },
    {
      title: '状态', key: 'status', width: 110,
      render: (_, r) => (
        r.role === 'super' ? <StatusBadge type="gold">超级管理员</StatusBadge> :
        <Switch size="small" checked={r.status === 'active'} onChange={checked => handleToggle(r.id, checked)} checkedChildren="启用" unCheckedChildren="禁用" />
      ),
    },
    { title: '最后登录', dataIndex: 'lastLogin', key: 'lastLogin', width: 160, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        r.role === 'super' ? <span style={{ color: '#4A4540', fontSize: 12 }}>不可修改</span> :
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除该账号？" onConfirm={() => { setAccounts(a => a.filter(item => item.id !== r.id)); message.success('已删除') }} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" style={{ color: '#C94C4C', fontSize: 12 }}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const logColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 160, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    { title: '账号', dataIndex: 'username', key: 'username', render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
    { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 140, render: v => <span style={{ color: '#9E9484', fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
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
            <Table dataSource={accounts} columns={accountColumns} rowKey="id" size="middle" pagination={false} />
          </div>
        </div>
      ),
    },
    {
      key: 'logs', label: '登录日志',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Table dataSource={mockLoginLogs} columns={logColumns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="账号管理" subtitle="管理后台管理员账号与权限分配" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} />
      </div>

      <Modal title={editing ? '编辑管理员' : '新增管理员'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input prefix={<UserOutlined style={{ color: '#4A4540' }} />} /></Form.Item>
          <Form.Item name="username" label="登录账号" rules={[{ required: true }]}><Input prefix={<span style={{ color: '#4A4540' }}>@</span>} /></Form.Item>
          {!editing && (
            <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6 }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#4A4540' }} />} placeholder="至少6位" />
            </Form.Item>
          )}
          <Form.Item name="role" label="角色权限" rules={[{ required: true }]}>
            <Select>
              <Option value="product">商品管理员（管理商品/雪茄库）</Option>
              <Option value="order">订单管理员（管理订单）</Option>
              <Option value="member">会员管理员（管理会员/储值）</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
