import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Space, Modal, Form, Select, Slider, message, Popconfirm, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/PageHeader'
import { getFlavorTags, createFlavorTag, updateFlavorTag, deleteFlavorTag } from '../../../api/library'

const { Option } = Select
const CATEGORIES = ['果香系', '木质系', '土香系', '咖啡系', '辛香系', '奶香系', '皮革系', '花香系', '坚果系', '甜香系', '烟熏系']

export default function TagManagement() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFlavorTags({ pageSize: 200 })
      const body = res.data.data
      setData(body.list || [])
    } catch (err) {
      console.error('获取风味标签失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }

  const openEdit = (r) => {
    setEditing(r)
    form.setFieldsValue({
      name: r.name,
      category: r.category,
      aiWeight: r.aiWeight ?? 0.5,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const vals = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        name: vals.name,
        category: vals.category,
        aiWeight: vals.aiWeight ?? 0.5,
      }
      if (editing) {
        await updateFlavorTag(editing.id || editing.tagId, payload)
        message.success('标签已更新，AI推荐规则实时生效')
      } else {
        await createFlavorTag(payload)
        message.success('新标签已添加')
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
      await deleteFlavorTag(id)
      message.success('已删除')
      fetchData()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '标签名', dataIndex: 'name', key: 'name',
      render: v => (
        <span style={{ fontSize: 13, color: '#C9A84C', background: 'rgba(201,168,76,0.12)', padding: '3px 12px', borderRadius: 999, border: '1px solid rgba(201,168,76,0.25)' }}>{v}</span>
      ),
    },
    { title: '分类', dataIndex: 'category', key: 'category', render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: 'AI权重', key: 'aiWeight', width: 180,
      render: (_, r) => {
        const w = r.aiWeight ?? 0.5
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: '#1F1F1F', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${w * 100}%`, height: '100%', background: 'linear-gradient(90deg, #7A6430, #E8C97A)', borderRadius: 3 }} />
            </div>
            <span style={{ color: '#C9A84C', fontSize: 12, fontWeight: 600, width: 32 }}>{w}</span>
          </div>
        )
      },
    },
    { title: '关联雪茄数', key: 'count', width: 100, render: (_, r) => <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{r.count ?? r._count ?? 0}</span> },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="删除标签后AI推荐规则实时变更" onConfirm={() => handleDelete(r.id || r.tagId)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="风味标签管理"
        subtitle="标签变更后AI推荐规则实时生效"
        breadcrumbs={['雪茄库管理']}
        extra={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
            新增标签
          </Button>,
        ]}
      />

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: '#9E9484', fontSize: 12, marginBottom: 12 }}>标签云预览</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.map(t => {
            const w = t.aiWeight ?? 0.5
            return (
              <span key={t.id || t.tagId} style={{
                fontSize: Math.round(11 + w * 4),
                color: '#C9A84C', background: `rgba(201,168,76,${0.08 + w * 0.1})`,
                padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(201,168,76,0.2)',
                cursor: 'default',
              }}>{t.name}</span>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Spin spinning={loading}>
          <Table dataSource={data} columns={columns} rowKey={(r) => r.id || r.tagId} size="middle" pagination={false} />
        </Spin>
      </div>

      <Modal title={editing ? '编辑风味标签' : '新增风味标签'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} okText="保存" cancelText="取消" confirmLoading={saving}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="标签名" rules={[{ required: true }]}><Input placeholder="例：果香甜润" /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select>{CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="aiWeight" label="AI推荐权重（0.0 ~ 1.0）">
            <Slider min={0} max={1} step={0.05} marks={{ 0: '0', 0.5: '0.5', 1: '1.0' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
