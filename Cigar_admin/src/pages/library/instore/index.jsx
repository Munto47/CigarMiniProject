import { useState } from 'react'
import { Table, Button, Input, Space, Modal, Form, InputNumber, Select, Tag, Upload, message, Popconfirm, Tooltip } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ImportOutlined, ExportOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'
import { mockCigars } from '../../../mock/cigars'
import PageHeader from '../../../components/PageHeader'

const { Option } = Select

export default function InstoreLibrary() {
  const [data, setData] = useState(mockCigars)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [form] = Form.useForm()

  const filtered = data.filter(c => !search || c.name.includes(search) || c.brand.includes(search))

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    form.setFieldsValue({ ...r, ...r.flavor, tags: r.tags, aiTags: r.aiTags, scene: r.scene })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const vals = await form.validateFields()
    if (editing) {
      setData(d => d.map(c => c.id === editing.id ? { ...c, ...vals, flavor: { start: vals.start, mid: vals.mid, end: vals.end } } : c))
      message.success('雪茄库已更新，AI推荐引擎同步刷新')
    } else {
      setData(d => [{ ...vals, id: Date.now(), rating: 0, ratingCount: 0, status: 'active', isNew: true, createdAt: new Date().toISOString().slice(0, 10), flavor: { start: vals.start, mid: vals.mid, end: vals.end } }, ...d])
      message.success('新雪茄已加入在售库')
    }
    setModalOpen(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1800))
    setSyncing(false)
    message.success('已强制同步至小程序、AI引擎及美团收银')
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
          <div style={{ color: '#6B6560', fontSize: 12 }}>{r.brand} / {r.category}</div>
        </div>
      ),
    },
    {
      title: '价格', key: 'price', width: 150,
      render: (_, r) => (
        <div>
          <div style={{ color: '#9E9484', fontSize: 12, textDecoration: 'line-through' }}>原价 ¥{r.price}</div>
          <div style={{ color: '#C9A84C', fontWeight: 600 }}>储值价 ¥{r.memberPrice}</div>
        </div>
      ),
    },
    {
      title: '库存', dataIndex: 'stock', width: 70,
      render: v => <span style={{ color: v === 0 ? '#C94C4C' : v < 10 ? '#E8A04C' : '#4CAF7A', fontWeight: 600 }}>{v === 0 ? '售罄' : v}</span>,
    },
    {
      title: '风味', key: 'flavor', width: 200,
      render: (_, r) => (
        <div style={{ fontSize: 11, color: '#9E9484', lineHeight: 1.8 }}>
          <div>前：{r.flavor.start}</div>
          <div>中：{r.flavor.mid}</div>
          <div>尾：{r.flavor.end}</div>
        </div>
      ),
    },
    {
      title: 'AI标签', key: 'aiTags', width: 150,
      render: (_, r) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {r.aiTags?.map(t => (
            <span key={t} style={{ fontSize: 11, color: '#C9A84C', background: 'rgba(201,168,76,0.12)', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(201,168,76,0.2)' }}>{t}</span>
          ))}
        </div>
      ),
    },
    { title: '时长', dataIndex: 'duration', width: 100, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span> },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#C9A84C' }} onClick={() => openEdit(r)} />
          <Popconfirm title="删除后不可恢复" onConfirm={() => { setData(d => d.filter(c => c.id !== r.id)); message.success('已删除') }} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
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
          <Button key="import" icon={<ImportOutlined />}
            style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}
            onClick={() => message.info('请选择 Excel 文件（.xlsx）进行批量导入')}>
            批量导入
          </Button>,
          <Button key="export" icon={<ExportOutlined />}
            style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}
            onClick={() => message.success('导出成功（演示）')}>
            导出备份
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
            新增雪茄
          </Button>,
        ]}
      />

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Input prefix={<SearchOutlined style={{ color: '#4A4540' }} />} placeholder="搜索名称 / 品牌" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
        <span style={{ color: '#6B6560', fontSize: 13, marginLeft: 'auto' }}>共 {filtered.length} 支</span>
      </div>

      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
      </div>

      <Modal
        title={editing ? '编辑雪茄数据' : '新增在售雪茄'}
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={handleSave} okText="保存并同步" cancelText="取消"
        width={700}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="雪茄名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="brand" label="品牌" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="price" label="原价(¥)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="memberPrice" label="储值价(¥)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="stock" label="库存"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="strength" label="浓度">
              <Select><Option value="轻柔温和">轻柔温和</Option><Option value="均衡适中">均衡适中</Option><Option value="浓郁丰厚">浓郁丰厚</Option><Option value="醇厚强劲">醇厚强劲</Option></Select>
            </Form.Item>
            <Form.Item name="duration" label="品鉴时长"><Input placeholder="例：60-90分钟" /></Form.Item>
            <Form.Item name="spec" label="规格"><Select><Option value="单支">单支</Option><Option value="礼盒">礼盒</Option></Select></Form.Item>
          </div>
          <Form.Item name="start" label="前段风味"><Input placeholder="例：雪松木、奶油" /></Form.Item>
          <Form.Item name="mid" label="中段风味"><Input placeholder="例：咖啡可可、皮革" /></Form.Item>
          <Form.Item name="end" label="尾段风味"><Input placeholder="例：泥土矿物、胡椒" /></Form.Item>
          <Form.Item name="aiTags" label="AI匹配标签（用于推荐引擎）">
            <Select mode="tags" placeholder="输入后回车添加标签" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="scene" label="适配场景">
            <Select mode="multiple" placeholder="选择场景">
              {['商务会谈', '独处休闲', '朋友聚会', '庆祝场合'].map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
