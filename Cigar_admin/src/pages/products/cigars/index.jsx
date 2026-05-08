import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Select, Space, Modal, Form, InputNumber, Tag, Switch, message, Popconfirm, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ExportOutlined, StarFilled } from '@ant-design/icons'
import PageHeader from '../../../components/PageHeader'
import { getCigars, createCigar, updateCigar, deleteCigar } from '../../../api/products'

const { Option } = Select

const CATEGORIES = [
  { code: 'luxury',  name: '奢华系列' },
  { code: 'classic', name: '经典系列' },
  { code: 'strong',  name: '浓郁系列' },
  { code: 'mild',    name: '轻柔系列' },
  { code: 'limited', name: '限量系列' },
]

export default function CigarList() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
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
      if (categoryFilter) params.categoryCode = categoryFilter
      if (search) params.keyword = search
      if (statusFilter) params.status = statusFilter
      const res = await getCigars(params)
      const body = res.data.data
      setData(body.list || [])
      setTotal(body.total || 0)
    } catch (err) {
      console.error('获取雪茄列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, categoryFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      brand: record.brand,
      categoryCode: record.categoryCode,
      spec: record.spec,
      priceCents: record.priceCents ? Number(record.priceCents) / 100 : undefined,
      memberPriceCents: record.memberPriceCents ? Number(record.memberPriceCents) / 100 : undefined,
      stock: record.stock,
      strength: record.strength,
      duration: record.duration,
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
        brand: vals.brand,
        categoryCode: vals.categoryCode || vals.category,
        spec: vals.spec,
        priceCents: Math.round((vals.priceCents || 0) * 100),
        memberPriceCents: Math.round((vals.memberPriceCents || 0) * 100),
        stock: vals.stock,
        strength: vals.strength,
        duration: vals.duration,
        isNew: vals.isNew,
      }
      if (editing) {
        await updateCigar(editing.id || editing.cigarId, payload)
      } else {
        await createCigar(payload)
      }
      message.success(editing ? '雪茄信息已更新' : '雪茄已添加')
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
      await deleteCigar(id)
      message.success('已删除')
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const handleStatusToggle = async (id, checked) => {
    try {
      await updateCigar(id, { status: checked ? 'active' : 'disabled' })
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
      title: '雪茄', key: 'cigar', width: 220,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #3D2B00, #6B4800)',
            border: '1px solid rgba(201,168,76,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>{r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} /> : '🚬'}</div>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>
              {r.name}
              {r.isNew && <Tag color="#C9A84C" style={{ marginLeft: 6, fontSize: 10, padding: '0 4px', lineHeight: '16px', color: '#1A1208' }}>NEW</Tag>}
            </div>
            <div style={{ color: '#6B6560', fontSize: 12 }}>{r.brand}{r.categoryCode ? ` · ${r.categoryCode}` : ''}</div>
          </div>
        </div>
      ),
    },
    {
      title: '规格', dataIndex: 'spec', key: 'spec', width: 70,
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span>,
    },
    {
      title: '原价', key: 'price', width: 90,
      render: (_, r) => <span style={{ color: '#F5F0E8' }}>¥{formatPrice(r.priceCents)}</span>,
    },
    {
      title: '储值价', key: 'memberPrice', width: 90,
      render: (_, r) => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{formatPrice(r.memberPriceCents)}</span>,
    },
    {
      title: '库存', dataIndex: 'stock', key: 'stock', width: 70,
      render: v => (
        <span style={{ color: v === 0 ? '#C94C4C' : v < 10 ? '#E8A04C' : '#4CAF7A', fontWeight: 600 }}>
          {v === 0 ? '售罄' : v}
        </span>
      ),
    },
    {
      title: '评分', key: 'rating', width: 110,
      render: (_, r) => (
        <span style={{ color: '#C9A84C', fontSize: 12 }}>
          <StarFilled style={{ marginRight: 3 }} />
          {r.ratingAvg ? Number(r.ratingAvg).toFixed(1) : '-'} ({r.ratingCount || 0})
        </span>
      ),
    },
    {
      title: '状态', key: 'status', width: 90,
      render: (_, r) => (
        <Switch
          size="small"
          checked={r.status === 'active'}
          onChange={checked => handleStatusToggle(r.id || r.cigarId, checked)}
          checkedChildren="上架" unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id || r.cigarId)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="雪茄商品管理"
        subtitle="管理小程序在售雪茄商品"
        breadcrumbs={['商品管理']}
        extra={[
          <Button key="export" icon={<ExportOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
            导出
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
            添加雪茄
          </Button>,
        ]}
      />

      {/* 筛选栏 */}
      <div style={{
        background: '#161616', border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#4A4540' }} />}
          placeholder="搜索雪茄名称 / 品牌"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }}
        />
        <Select placeholder="全部分类" value={categoryFilter || undefined} onChange={v => { setCategoryFilter(v || ''); setPage(1) }} allowClear style={{ width: 160 }}>
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
            dataSource={data} columns={columns} rowKey={(r) => r.id || r.cigarId}
            pagination={{
              current: page, pageSize, total,
              showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            }}
            size="middle"
          />
        </Spin>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editing ? '编辑雪茄' : '添加雪茄'}
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={handleSave} okText="保存" cancelText="取消" confirmLoading={saving}
        width={680}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="雪茄名称" rules={[{ required: true }]}>
              <Input placeholder="例：Cohiba Behike 52" />
            </Form.Item>
            <Form.Item name="brand" label="品牌" rules={[{ required: true }]}>
              <Input placeholder="例：Cohiba" />
            </Form.Item>
            <Form.Item name="categoryCode" label="分类" rules={[{ required: true }]}>
              <Select placeholder="选择分类">
                {CATEGORIES.map(c => <Option key={c.code} value={c.code}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="spec" label="规格">
              <Select>
                <Option value="单支">单支</Option>
                <Option value="礼盒">礼盒</Option>
              </Select>
            </Form.Item>
            <Form.Item name="priceCents" label="原价(¥)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="memberPriceCents" label="储值价(¥)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="strength" label="浓度">
              <Select placeholder="选择浓度">
                <Option value="轻柔温和">轻柔温和</Option>
                <Option value="均衡适中">均衡适中</Option>
                <Option value="浓郁丰厚">浓郁丰厚</Option>
                <Option value="醇厚强劲">醇厚强劲</Option>
              </Select>
            </Form.Item>
            <Form.Item name="duration" label="品鉴时长">
              <Input placeholder="例：60-90分钟" />
            </Form.Item>
            <Form.Item name="isNew" label="NEW标识" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
