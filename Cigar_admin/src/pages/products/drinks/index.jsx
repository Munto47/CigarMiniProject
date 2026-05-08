import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Select, Space, Modal, Form, InputNumber, Switch, message, Popconfirm, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/PageHeader'
import { getDrinks, createDrink, updateDrink, deleteDrink } from '../../../api/products'

const { Option } = Select
const CATEGORIES = [
  { code: 'whisky',  name: '威士忌' },
  { code: 'brandy',  name: '白兰地' },
  { code: 'rum',     name: '朗姆酒' },
  { code: 'wine',    name: '葡萄酒' },
  { code: 'tea',     name: '茶饮' },
  { code: 'coffee',  name: '咖啡' },
]

export default function DrinkList() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (catFilter) params.categoryCode = catFilter
      if (search) params.keyword = search
      if (statusFilter) params.status = statusFilter
      const res = await getDrinks(params)
      const body = res.data.data
      setData(body.list || [])
      setTotal(body.total || 0)
    } catch (err) {
      console.error('获取饮品列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, catFilter, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      categoryCode: record.categoryCode,
      priceCents: record.priceCents ? Number(record.priceCents) / 100 : undefined,
      memberPriceCents: record.memberPriceCents ? Number(record.memberPriceCents) / 100 : undefined,
      stock: record.stock,
      description: record.description,
      isNew: record.isNew,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const vals = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        name: vals.name,
        categoryCode: vals.categoryCode || vals.category,
        priceCents: Math.round((vals.priceCents || 0) * 100),
        memberPriceCents: Math.round((vals.memberPriceCents || 0) * 100),
        stock: vals.stock || 0,
        description: vals.description,
        isNew: vals.isNew,
      }
      if (editing) {
        await updateDrink(editing.id || editing.drinkId, payload)
      } else {
        await createDrink(payload)
      }
      message.success(editing ? '饮品已更新' : '饮品已添加')
      setModalOpen(false)
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDrink(id)
      message.success('已删除')
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const handleStatusToggle = async (id, checked) => {
    try {
      await updateDrink(id, { status: checked ? 'active' : 'disabled' })
      message.success(checked ? '已上架' : '已下架')
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '状态更新失败')
    }
  }

  const formatPrice = (cents) => {
    if (!cents && cents !== 0n) return '-'
    const n = typeof cents === 'bigint' ? Number(cents) / 100 : Number(cents) / 100
    return n.toLocaleString()
  }

  const columns = [
    {
      title: '饮品', key: 'drink', width: 200,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #1A2A3A, #2A4A6A)',
            border: '1px solid rgba(201,168,76,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>{r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} /> : '🥃'}</div>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>
              {r.name}
              {r.isNew && <span style={{ marginLeft: 6, fontSize: 10, color: '#C9A84C', background: 'rgba(201,168,76,0.15)', padding: '1px 5px', borderRadius: 4 }}>NEW</span>}
            </div>
            <div style={{ color: '#6B6560', fontSize: 12 }}>{r.categoryCode || r.category}</div>
          </div>
        </div>
      ),
    },
    { title: '原价', key: 'price', width: 90, render: (_, r) => <span style={{ color: '#F5F0E8' }}>¥{formatPrice(r.priceCents)}</span> },
    { title: '储值价', key: 'memberPrice', width: 90, render: (_, r) => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{formatPrice(r.memberPriceCents)}</span> },
    {
      title: '库存', dataIndex: 'stock', key: 'stock', width: 80,
      render: v => <span style={{ color: v === 0 ? '#C94C4C' : v < 20 ? '#E8A04C' : '#4CAF7A', fontWeight: 600 }}>{v === 0 ? '售罄' : v}</span>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '状态', key: 'status', width: 90,
      render: (_, r) => (
        <Switch size="small" checked={r.status === 'active'}
          onChange={checked => handleStatusToggle(r.id || r.drinkId, checked)}
          checkedChildren="上架" unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id || r.drinkId)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
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

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索饮品名称" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: 220, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <Select placeholder="全部分类" value={catFilter || undefined} onChange={v => { setCatFilter(v || ''); setPage(1) }} allowClear style={{ width: 140 }}>
          {CATEGORIES.map(c => <Option key={c.code} value={c.code}>{c.name}</Option>)}
        </Select>
        <Select placeholder="全部状态" value={statusFilter || undefined} onChange={v => { setStatusFilter(v || ''); setPage(1) }} allowClear style={{ width: 120 }}>
          <Option value="active">上架</Option>
          <Option value="disabled">下架</Option>
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {total} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            dataSource={data} columns={columns} rowKey={(r) => r.id || r.drinkId}
            pagination={{
              current: page, pageSize, total,
              showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            }}
            size="middle"
          />
        </Spin>
      </div>

      <Modal title={editing ? '编辑饮品' : '添加饮品'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消" confirmLoading={saving}
        width={560}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="饮品名称" rules={[{ required: true }]}><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="categoryCode" label="分类" rules={[{ required: true }]}>
              <Select>{CATEGORIES.map(c => <Option key={c.code} value={c.code}>{c.name}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="stock" label="库存"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="priceCents" label="原价(¥)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="memberPriceCents" label="储值价(¥)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="isNew" label="NEW标识" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
