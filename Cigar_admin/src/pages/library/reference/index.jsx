import { useState } from 'react'
import { Table, Button, Input, Space, Modal, Form, message, Popconfirm } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { mockIndustryRef } from '../../../mock/cigars'
import PageHeader from '../../../components/PageHeader'

export default function ReferenceLibrary() {
  const [data, setData] = useState(mockIndustryRef)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const filtered = data.filter(c => !search || c.name.includes(search) || c.brand.includes(search))

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditing(r); form.setFieldsValue({ ...r, ...r.flavor }); setModalOpen(true) }

  const handleSave = async () => {
    const vals = await form.validateFields()
    if (editing) {
      setData(d => d.map(c => c.id === editing.id ? { ...c, ...vals, flavor: { start: vals.start, mid: vals.mid, end: vals.end } } : c))
      message.success('参考库已更新')
    } else {
      setData(d => [...d, { ...vals, id: Date.now(), flavor: { start: vals.start, mid: vals.mid, end: vals.end } }])
      message.success('已加入行业参考库')
    }
    setModalOpen(false)
  }

  const columns = [
    {
      title: '雪茄信息', key: 'info', width: 250,
      render: (_, r) => (
        <div>
          <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>{r.name}</div>
          <div style={{ color: '#6B6560', fontSize: 12 }}>{r.brand} · {r.category}</div>
        </div>
      ),
    },
    {
      title: '风味（三段）', key: 'flavor',
      render: (_, r) => (
        <div style={{ fontSize: 12, color: '#9E9484', lineHeight: 1.8 }}>
          <span style={{ color: '#6B6560' }}>前：</span>{r.flavor.start}
          <span style={{ color: '#6B6560', marginLeft: 12 }}>中：</span>{r.flavor.mid}
          <span style={{ color: '#6B6560', marginLeft: 12 }}>尾：</span>{r.flavor.end}
        </div>
      ),
    },
    { title: '浓度', dataIndex: 'strength', width: 100, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span> },
    {
      title: '备注', dataIndex: 'note', width: 160,
      render: v => <span style={{ fontSize: 11, color: '#4A4540', background: 'rgba(201,168,76,0.08)', padding: '2px 8px', borderRadius: 4 }}>{v}</span>,
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => { setData(d => d.filter(c => c.id !== r.id)); message.success('已删除') }} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="行业风味参考库"
        subtitle="非本店在售，仅用于AI风味参考推荐，不展示价格与购买入口"
        breadcrumbs={['雪茄库管理']}
        extra={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
            新增参考款
          </Button>,
        ]}
      />

      <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#9E9484' }}>
        💡 此库中的雪茄将在小程序雪茄详情页的「行业风味参考」模块展示，标注"仅供风味参考"，无购买入口
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索名称 / 品牌" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {filtered.length} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
      </div>

      <Modal title={editing ? '编辑参考款' : '新增参考款'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消" width={600}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="雪茄名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="brand" label="品牌" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="category" label="分类"><Input /></Form.Item>
            <Form.Item name="strength" label="浓度"><Input /></Form.Item>
          </div>
          <Form.Item name="start" label="前段风味"><Input /></Form.Item>
          <Form.Item name="mid" label="中段风味"><Input /></Form.Item>
          <Form.Item name="end" label="尾段风味"><Input /></Form.Item>
          <Form.Item name="note" label="备注"><Input placeholder="例：行业风味参考" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
