import { useState } from 'react'
import { Table, Button, Input, Select, Space, Modal, Form, InputNumber, Switch, message, Popconfirm } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { mockDrinks } from '../../../mock/drinks'
import PageHeader from '../../../components/PageHeader'

const { Option } = Select
const CATEGORIES = ['威士忌', '鸡尾酒', '咖啡', '茶饮', '软饮', '其他']

export default function DrinkList() {
  const [data, setData] = useState(mockDrinks)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const filtered = data.filter(d =>
    (!search || d.name.includes(search)) &&
    (!catFilter || d.category === catFilter)
  )

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSave = async () => {
    const vals = await form.validateFields()
    if (editing) {
      setData(d => d.map(item => item.id === editing.id ? { ...item, ...vals } : item))
      message.success('饮品已更新')
    } else {
      setData(d => [{ ...vals, id: Date.now(), createdAt: new Date().toISOString().slice(0, 10) }, ...d])
      message.success('饮品已添加')
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => { setData(d => d.filter(item => item.id !== id)); message.success('已删除') }

  const columns = [
    {
      title: '饮品', key: 'drink',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #1A2A3A, #2A4A6A)',
            border: '1px solid rgba(201,168,76,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🥃</div>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>
              {r.name}
              {r.isNew && <span style={{ marginLeft: 6, fontSize: 10, color: '#C9A84C', background: 'rgba(201,168,76,0.15)', padding: '1px 5px', borderRadius: 4 }}>NEW</span>}
            </div>
            <div style={{ color: '#6B6560', fontSize: 12 }}>{r.category}</div>
          </div>
        </div>
      ),
    },
    { title: '原价', dataIndex: 'price', key: 'price', width: 90, render: v => <span style={{ color: '#F5F0E8' }}>¥{v}</span> },
    { title: '储值价', dataIndex: 'memberPrice', key: 'memberPrice', width: 90, render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v}</span> },
    {
      title: '库存', dataIndex: 'stock', key: 'stock', width: 80,
      render: v => <span style={{ color: v === 0 ? '#C94C4C' : v < 20 ? '#E8A04C' : '#4CAF7A', fontWeight: 600 }}>{v === 0 ? '售罄' : v}</span>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span> },
    {
      title: '状态', key: 'status', width: 100,
      render: (_, r) => (
        <Switch size="small" checked={r.status === 'active'}
          onChange={checked => setData(d => d.map(item => item.id === r.id ? { ...item, status: checked ? 'active' : 'disabled' } : item))}
          checkedChildren="上架" unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="饮品商品管理"
        subtitle="管理小程序在售配饮商品"
        breadcrumbs={['商品管理']}
        extra={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
            添加饮品
          </Button>,
        ]}
      />

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索饮品名称" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <Select placeholder="全部分类" value={catFilter || undefined} onChange={setCatFilter} allowClear style={{ width: 140 }}>
          {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {filtered.length} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
      </div>

      <Modal title={editing ? '编辑饮品' : '添加饮品'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消"
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="饮品名称" rules={[{ required: true }]}><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select>{CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="stock" label="库存"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="price" label="原价(¥)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="memberPrice" label="储值价(¥)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="isNew" label="NEW标识" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
