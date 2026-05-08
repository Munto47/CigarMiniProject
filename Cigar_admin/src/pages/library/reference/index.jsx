import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Space, Modal, Form, message, Popconfirm, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/PageHeader'
import { getReferenceCigars, createReferenceCigar, updateReferenceCigar, deleteReferenceCigar } from '../../../api/library'

export default function ReferenceLibrary() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (search) params.keyword = search
      const res = await getReferenceCigars(params)
      const body = res.data.data
      setData(body.list || [])
      setTotal(body.total || 0)
    } catch (err) {
      console.error('获取参考库失败:', err)
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
      strength: r.strength,
      flavorStart: r.flavorStart,
      flavorMid: r.flavorMid,
      flavorEnd: r.flavorEnd,
      note: r.note,
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
        strength: vals.strength,
        flavorStart: vals.flavorStart || vals.start,
        flavorMid: vals.flavorMid || vals.mid,
        flavorEnd: vals.flavorEnd || vals.end,
        note: vals.note,
      }
      if (editing) {
        await updateReferenceCigar(editing.id || editing.refId, payload)
        message.success('参考库已更新')
      } else {
        await createReferenceCigar(payload)
        message.success('已加入行业参考库')
      }
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
      await deleteReferenceCigar(id)
      message.success('已删除')
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '雪茄信息', key: 'info', width: 240,
      render: (_, r) => (
        <div>
          <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>{r.name}</div>
          <div style={{ color: '#6B6560', fontSize: 12 }}>{r.brand}{r.categoryCode ? ` · ${r.categoryCode}` : ''}</div>
        </div>
      ),
    },
    {
      title: '风味（三段）', key: 'flavor',
      render: (_, r) => (
        <div style={{ fontSize: 12, color: '#9E9484', lineHeight: 1.8 }}>
          {r.flavorStart && <><span style={{ color: '#6B6560' }}>前：</span>{r.flavorStart}</>}
          {r.flavorMid && <><span style={{ color: '#6B6560', marginLeft: 12 }}>中：</span>{r.flavorMid}</>}
          {r.flavorEnd && <><span style={{ color: '#6B6560', marginLeft: 12 }}>尾：</span>{r.flavorEnd}</>}
          {!r.flavorStart && !r.flavorMid && !r.flavorEnd && '-'}
        </div>
      ),
    },
    { title: '浓度', dataIndex: 'strength', width: 100, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '备注', dataIndex: 'note', width: 150,
      render: v => <span style={{ fontSize: 11, color: '#4A4540', background: 'rgba(201,168,76,0.08)', padding: '2px 8px', borderRadius: 4 }}>{v || '-'}</span>,
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id || r.refId)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
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

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索名称 / 品牌" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {total} 条</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table
            dataSource={data} columns={columns} rowKey={(r) => r.id || r.refId}
            pagination={{
              current: page, pageSize, total,
              showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            }}
            size="middle"
          />
        </Spin>
      </div>

      <Modal title={editing ? '编辑参考款' : '新增参考款'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消" confirmLoading={saving} width={600}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="雪茄名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="brand" label="品牌" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="categoryCode" label="分类"><Input /></Form.Item>
            <Form.Item name="strength" label="浓度"><Input /></Form.Item>
          </div>
          <Form.Item name="flavorStart" label="前段风味"><Input /></Form.Item>
          <Form.Item name="flavorMid" label="中段风味"><Input /></Form.Item>
          <Form.Item name="flavorEnd" label="尾段风味"><Input /></Form.Item>
          <Form.Item name="note" label="备注"><Input placeholder="例：行业风味参考" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
