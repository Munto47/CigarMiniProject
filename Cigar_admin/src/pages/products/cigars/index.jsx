import { useState } from 'react'
import { Table, Button, Input, Select, Space, Modal, Form, InputNumber, Tag, Switch, message, Popconfirm, Rate, Tooltip } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ExportOutlined, StarFilled } from '@ant-design/icons'
import { mockCigars } from '../../../mock/cigars'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'

const { Option } = Select
const { TextArea } = Input

const CATEGORIES = ['古巴雪茄', '多米尼加雪茄', '尼加拉瓜雪茄', '洪都拉斯雪茄', '墨西哥雪茄']
const STRENGTHS = ['轻柔温和', '均衡适中', '浓郁丰厚', '醇厚强劲']

export default function CigarList() {
  const [data, setData] = useState(mockCigars)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const filtered = data.filter(c =>
    (!search || c.name.includes(search) || c.brand.includes(search)) &&
    (!categoryFilter || c.category === categoryFilter) &&
    (!statusFilter || c.status === statusFilter)
  )

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (record) => { setEditing(record); form.setFieldsValue({ ...record, ...record.flavor }); setModalOpen(true) }

  const handleSave = async () => {
    const vals = await form.validateFields()
    if (editing) {
      setData(d => d.map(c => c.id === editing.id ? { ...c, ...vals, flavor: { start: vals.start, mid: vals.mid, end: vals.end } } : c))
      message.success('雪茄信息已更新')
    } else {
      const newItem = { ...vals, id: Date.now(), rating: 0, ratingCount: 0, createdAt: new Date().toISOString().slice(0, 10), flavor: { start: vals.start, mid: vals.mid, end: vals.end } }
      setData(d => [newItem, ...d])
      message.success('雪茄已添加')
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    setData(d => d.filter(c => c.id !== id))
    message.success('已删除')
  }

  const handleStatusToggle = (id, checked) => {
    setData(d => d.map(c => c.id === id ? { ...c, status: checked ? 'active' : 'disabled' } : c))
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
          }}>🚬</div>
          <div>
            <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>
              {r.name}
              {r.isNew && <Tag color="#C9A84C" style={{ marginLeft: 6, fontSize: 10, padding: '0 4px', lineHeight: '16px', color: '#1A1208' }}>NEW</Tag>}
            </div>
            <div style={{ color: '#6B6560', fontSize: 12 }}>{r.brand} · {r.category}</div>
          </div>
        </div>
      ),
    },
    {
      title: '规格', dataIndex: 'spec', key: 'spec', width: 70,
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span>,
    },
    {
      title: '原价', dataIndex: 'price', key: 'price', width: 90,
      render: v => <span style={{ color: '#F5F0E8' }}>¥{v.toLocaleString()}</span>,
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: '储值价', dataIndex: 'memberPrice', key: 'memberPrice', width: 90,
      render: v => <span style={{ color: '#C9A84C', fontWeight: 600 }}>¥{v.toLocaleString()}</span>,
    },
    {
      title: '库存', dataIndex: 'stock', key: 'stock', width: 70,
      render: v => (
        <span style={{ color: v === 0 ? '#C94C4C' : v < 10 ? '#E8A04C' : '#4CAF7A', fontWeight: 600 }}>
          {v === 0 ? '售罄' : v}
        </span>
      ),
      sorter: (a, b) => a.stock - b.stock,
    },
    {
      title: '评分', key: 'rating', width: 110,
      render: (_, r) => (
        <span style={{ color: '#C9A84C', fontSize: 12 }}>
          <StarFilled style={{ marginRight: 3 }} />
          {r.rating} ({r.ratingCount})
        </span>
      ),
    },
    {
      title: '状态', key: 'status', width: 90,
      render: (_, r) => (
        <Switch
          size="small"
          checked={r.status === 'active'}
          onChange={checked => handleStatusToggle(r.id, checked)}
          checkedChildren="上架" unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 100,
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
        title="雪茄商品管理"
        subtitle="管理小程序在售雪茄商品"
        breadcrumbs={['商品管理']}
        extra={[
          <Button key="export" icon={<ExportOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }} onClick={() => message.info('导出功能待后端接入')}>
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
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }}
        />
        <Select placeholder="全部分类" value={categoryFilter || undefined} onChange={setCategoryFilter} allowClear style={{ width: 160 }}>
          {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
        </Select>
        <Select placeholder="全部状态" value={statusFilter || undefined} onChange={setStatusFilter} allowClear style={{ width: 120 }}>
          <Option value="active">上架</Option>
          <Option value="disabled">下架</Option>
          <Option value="soldout">售罄</Option>
        </Select>
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {filtered.length} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table
          dataSource={filtered} columns={columns} rowKey="id"
          pagination={{ pageSize: 10, showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span> }}
          size="middle"
        />
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editing ? '编辑雪茄' : '添加雪茄'}
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={handleSave} okText="保存" cancelText="取消"
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
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select placeholder="选择分类">
                {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="spec" label="规格">
              <Select>
                <Option value="单支">单支</Option>
                <Option value="礼盒">礼盒</Option>
              </Select>
            </Form.Item>
            <Form.Item name="price" label="原价(¥)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="memberPrice" label="储值价(¥)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="strength" label="浓度">
              <Select placeholder="选择浓度">
                {STRENGTHS.map(s => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="duration" label="品鉴时长">
              <Input placeholder="例：60-90分钟" />
            </Form.Item>
            <Form.Item name="isNew" label="NEW标识" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item name="start" label="前段风味"><Input placeholder="例：雪松木、奶油" /></Form.Item>
          <Form.Item name="mid" label="中段风味"><Input placeholder="例：咖啡可可、皮革" /></Form.Item>
          <Form.Item name="end" label="尾段风味"><Input placeholder="例：泥土矿物、胡椒" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
