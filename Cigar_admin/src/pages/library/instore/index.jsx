import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Space, Modal, Form, InputNumber, Select, Tag, Upload, message, Popconfirm, Tooltip, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ImportOutlined, ExportOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/PageHeader'
import { getInstoreCigars, createInstoreCigar, updateInstoreCigar, deleteInstoreCigar, syncInstore } from '../../../api/library'

const { Option } = Select

export default function InstoreLibrary() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (search) params.keyword = search
      const res = await getInstoreCigars(params)
      const body = res.data.data
      setData(body.list || [])
      setTotal(body.total || 0)
    } catch (err) {
      console.error('获取雪茄库失败:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }

  const openEdit = (r) => {
    setEditing(r)
    form.setFieldsValue({
      name: r.name,
      brand: r.brand,
      categoryCode: r.categoryCode,
      priceCents: r.priceCents ? Number(r.priceCents) / 100 : undefined,
      memberPriceCents: r.memberPriceCents ? Number(r.memberPriceCents) / 100 : undefined,
      stock: r.stock,
      strength: r.strength,
      duration: r.duration,
      spec: r.spec,
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
        priceCents: Math.round((vals.priceCents || 0) * 100),
        memberPriceCents: Math.round((vals.memberPriceCents || 0) * 100),
        stock: vals.stock || 0,
        strength: vals.strength,
        duration: vals.duration,
        spec: vals.spec,
      }
      if (editing) {
        await updateInstoreCigar(editing.id || editing.cigarId, payload)
      } else {
        await createInstoreCigar(payload)
      }
      message.success(editing ? '雪茄库已更新' : '新雪茄已加入在售库')
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
      await deleteInstoreCigar(id)
      message.success('已删除')
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncInstore()
      message.success('已强制同步至小程序、AI引擎及美团收银')
    } catch (err) {
      message.error(err.response?.data?.message || '同步失败')
    } finally {
      setSyncing(false)
    }
  }

  const formatPrice = (cents) => {
    if (!cents && cents !== 0n) return '-'
    return (Number(cents) / 100).toLocaleString()
  }

  const columns = [
    {
      title: '雪茄名称', key: 'name', width: 220,
      render: (_, r) => (
        <div>
          <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>
            {r.name}
            {r.isNew && <Tag color="gold" style={{ marginLeft: 6, fontSize: 10, color: '#1A1208' }}>NEW</Tag>}
          </div>
          <div style={{ color: '#6B6560', fontSize: 12 }}>{r.brand}{r.categoryCode ? ` / ${r.categoryCode}` : ''}</div>
        </div>
      ),
    },
    {
      title: '价格', key: 'price', width: 140,
      render: (_, r) => (
        <div>
          <div style={{ color: '#9E9484', fontSize: 12, textDecoration: 'line-through' }}>原价 ¥{formatPrice(r.priceCents)}</div>
          <div style={{ color: '#C9A84C', fontWeight: 600 }}>储值价 ¥{formatPrice(r.memberPriceCents)}</div>
        </div>
      ),
    },
    {
      title: '库存', dataIndex: 'stock', width: 70,
      render: v => <span style={{ color: v === 0 ? '#C94C4C' : v < 10 ? '#E8A04C' : '#4CAF7A', fontWeight: 600 }}>{v === 0 ? '售罄' : v}</span>,
    },
    {
      title: '风味', key: 'flavor', width: 180,
      render: (_, r) => (
        <div style={{ fontSize: 11, color: '#9E9484', lineHeight: 1.8 }}>
          {r.flavorStart && <div>前：{r.flavorStart}</div>}
          {r.flavorMid && <div>中：{r.flavorMid}</div>}
          {r.flavorEnd && <div>尾：{r.flavorEnd}</div>}
          {!r.flavorStart && !r.flavorMid && !r.flavorEnd && '-'}
        </div>
      ),
    },
    { title: '时长', dataIndex: 'duration', width: 100, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="删除后不可恢复" onConfirm={() => handleDelete(r.id || r.cigarId)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="在售雪茄库"
        subtitle="用于销售、AI推荐、下单的核心雪茄数据库"
        breadcrumbs={['雪茄库管理']}
        extra={[
          <Tooltip key="sync" title="强制同步至小程序、AI引擎、美团收银">
            <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing}
              style={{ color: '#4CAF7A', borderColor: 'rgba(76,175,122,0.3)' }}>
              {syncing ? '同步中...' : '强制同步'}
            </Button>
          </Tooltip>,
          <Button key="export" icon={<ExportOutlined />}
            style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}
            onClick={() => window.open('/api/admin/export/cigars', '_blank')}>
            导出备份
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
            新增雪茄
          </Button>,
        ]}
      />

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索名称 / 品牌" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {total} 支</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            dataSource={data} columns={columns} rowKey={(r) => r.id || r.cigarId}
            pagination={{
              current: page, pageSize, total,
              showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 支</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            }}
            size="middle"
          />
        </Spin>
      </div>

      <Modal
        title={editing ? '编辑雪茄数据' : '新增在售雪茄'}
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={handleSave} okText="保存并同步" cancelText="取消" confirmLoading={saving}
        width={680}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="雪茄名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="brand" label="品牌" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="categoryCode" label="分类"><Input placeholder="例：古巴雪茄" /></Form.Item>
            <Form.Item name="spec" label="规格"><Select><Option value="单支">单支</Option><Option value="礼盒">礼盒</Option></Select></Form.Item>
            <Form.Item name="priceCents" label="原价(¥)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="memberPriceCents" label="储值价(¥)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="stock" label="库存"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="strength" label="浓度">
              <Select><Option value="轻柔温和">轻柔温和</Option><Option value="均衡适中">均衡适中</Option><Option value="浓郁丰厚">浓郁丰厚</Option><Option value="醇厚强劲">醇厚强劲</Option></Select>
            </Form.Item>
            <Form.Item name="duration" label="品鉴时长"><Input placeholder="例：60-90分钟" /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
