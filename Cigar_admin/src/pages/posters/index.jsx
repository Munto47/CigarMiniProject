import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Tabs, Form, Input, Select, Upload, message, Divider, Spin } from 'antd'
import { UploadOutlined, EyeOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getPosters, getPosterTemplate, updatePosterTemplate } from '../../api/posters'
import { uploadImage } from '../../api/upload'

const { Option } = Select

const BG_COLORS = ['#0D0D0D', '#1A0A00', '#000D1A', '#0A0D00']
const ACCENT_COLORS = ['#C9A84C', '#4C7AC9', '#4CAF7A', '#C94C4C']
const FONT_STYLES = [{ value: 'classic', label: '经典衬线' }, { value: 'modern', label: '现代无衬线' }, { value: 'elegant', label: '优雅细线' }]

export default function Posters() {
  const [records, setRecords] = useState([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [template, setTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const res = await getPosters({ page: recordsPage, pageSize: 10 })
      const body = res.data.data
      setRecords(body.list || [])
      setRecordsTotal(body.total || 0)
    } catch (err) {
      console.error('获取海报列表失败:', err)
    } finally {
      setRecordsLoading(false)
    }
  }, [recordsPage])

  const fetchTemplate = useCallback(async () => {
    setTemplateLoading(true)
    try {
      const res = await getPosterTemplate()
      const data = res.data.data || res.data
      if (data) setTemplate(data)
    } catch (err) {
      console.error('获取海报模板失败:', err)
    } finally {
      setTemplateLoading(false)
    }
  }, [])

  // 页面挂载时立即加载海报记录
  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleTabChange = (key) => {
    if (key === 'records') fetchRecords()
    else if (key === 'template') fetchTemplate()
  }

  const handleSaveTemplate = async () => {
    if (!template) return
    setSaving(true)
    try {
      await updatePosterTemplate({
        logoUrl: template.logoUrl,
        bgColor: template.bgColor,
        accentColor: template.accentColor,
        fontStyle: template.fontStyle,
        clubName: template.clubName,
        tagline: template.tagline,
      })
      message.success('模板配置已保存')
    } catch (err) {
      message.error(err.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field, value) => {
    setTemplate(t => ({ ...t, [field]: value }))
  }

  const columns = [
    {
      title: '用户', key: 'userName', width: 100,
      render: (_, r) => <span style={{ color: '#F5F0E8' }}>{r.userName || r.user?.nickname || '-'}</span>,
    },
    {
      title: '雪茄', key: 'cigarName', width: 200,
      render: (_, r) => <span style={{ color: '#C9A84C', fontWeight: 500 }}>{r.cigarName || r.cigar?.name || '-'}</span>,
    },
    {
      title: '风味标签', key: 'flavors',
      render: (_, r) => {
        const flavors = r.flavors || r.tags || []
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(Array.isArray(flavors) ? flavors : []).map(f => (
              <span key={typeof f === 'string' ? f : f.name} style={{ fontSize: 11, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', padding: '1px 8px', borderRadius: 999, border: '1px solid rgba(201,168,76,0.2)' }}>
                {typeof f === 'string' ? f : f.name}
              </span>
            ))}
            {(!flavors || flavors.length === 0) && <span style={{ color: '#4A4540', fontSize: 11 }}>-</span>}
          </div>
        )
      },
    },
    {
      title: '描述', key: 'description', width: 180,
      render: (_, r) => {
        const text = r.transcript || r.description || ''
        return <span style={{ color: '#9E9484', fontSize: 12 }}>{text.length > 40 ? text.slice(0, 40) + '...' : text || '-'}</span>
      },
    },
    { title: '生成时间', key: 'createdAt', width: 160, render: (_, r) => <span style={{ color: '#6B6560', fontSize: 12 }}>{r.createdAt || '-'}</span> },
    {
      title: '状态', key: 'status', width: 80,
      render: () => <StatusBadge type="success" dot>已生成</StatusBadge>,
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_, r) => (
        <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#C9A84C' }}
          onClick={() => window.open(`/api/posters/${r.id}`, '_blank')} />
      ),
    },
  ]

  const defaultTemplate = template || { bgColor: '#0D0D0D', accentColor: '#C9A84C', fontStyle: 'serif', clubName: 'GOAT CIGAR CLUB', tagline: '' }

  const tabItems = [
    {
      key: 'records', label: '海报记录',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Spin spinning={recordsLoading}>
            <Table
              dataSource={records} columns={columns} rowKey="id" size="middle"
              pagination={{
                current: recordsPage, pageSize: 10, total: recordsTotal,
                showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
                onChange: (p) => setRecordsPage(p),
              }}
            />
          </Spin>
        </div>
      ),
    },
    {
      key: 'template', label: '海报模板配置',
      children: (
        <div style={{ maxWidth: 560 }}>
          <Spin spinning={templateLoading}>
            <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>商家 LOGO</div>
                <Upload beforeUpload={async (file) => { try { const res = await uploadImage(file); updateField('logoUrl', res.data.data.url); message.success('LOGO 上传成功'); } catch { message.error('上传失败'); } return false }} showUploadList={false}>
                  <Button icon={<UploadOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
                    上传 LOGO（支持 PNG/SVG，建议透明背景）
                  </Button>
                </Upload>
                {defaultTemplate.logoUrl && <div style={{ color: '#C9A84C', fontSize: 11, marginTop: 6 }}>当前LOGO已设置</div>}
              </div>
              <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '16px 0' }} />

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>海报背景色</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {BG_COLORS.map(c => (
                    <div key={c} onClick={() => updateField('bgColor', c)} style={{
                      width: 48, height: 48, borderRadius: 10, background: c, cursor: 'pointer',
                      border: defaultTemplate.bgColor === c ? '2px solid #C9A84C' : '2px solid rgba(201,168,76,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {defaultTemplate.bgColor === c && <span style={{ color: '#C9A84C', fontSize: 18 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>主题色（文字/边框）</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {ACCENT_COLORS.map(c => (
                    <div key={c} onClick={() => updateField('accentColor', c)} style={{
                      width: 48, height: 48, borderRadius: 10, background: c, cursor: 'pointer',
                      border: defaultTemplate.accentColor === c ? '2px solid #F5F0E8' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {defaultTemplate.accentColor === c && <span style={{ color: '#fff', fontSize: 18 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>字体风格</div>
                <Select value={defaultTemplate.fontStyle} onChange={v => updateField('fontStyle', v)} style={{ width: '100%' }}>
                  {FONT_STYLES.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                </Select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>俱乐部名称</div>
                <Input value={defaultTemplate.clubName || ''} onChange={e => updateField('clubName', e.target.value)} style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>海报宣传语</div>
                <Input value={defaultTemplate.tagline || ''} onChange={e => updateField('tagline', e.target.value)} style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
              </div>

              <div style={{ background: defaultTemplate.bgColor, border: `2px solid ${defaultTemplate.accentColor}30`, borderRadius: 12, padding: 20, marginBottom: 20, aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ color: defaultTemplate.accentColor, fontSize: 10, letterSpacing: '0.3em', marginBottom: 8, opacity: 0.6 }}>FLAVOR PROFILE</div>
                <div style={{ color: defaultTemplate.accentColor, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>{defaultTemplate.clubName || 'GOAT CIGAR CLUB'}</div>
                <div style={{ color: defaultTemplate.accentColor, fontSize: 10, opacity: 0.6, marginBottom: 24 }}>{defaultTemplate.tagline || 'Your Flavor Journey Begins Here'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
                  {['雪松木', '咖啡可可', '泥土矿物'].map(f => (
                    <span key={f} style={{ fontSize: 11, color: defaultTemplate.accentColor, border: `1px solid ${defaultTemplate.accentColor}50`, padding: '2px 10px', borderRadius: 999 }}>{f}</span>
                  ))}
                </div>
                <div style={{ color: defaultTemplate.accentColor, opacity: 0.4, fontSize: 10, textAlign: 'center', padding: '0 20px' }}>
                  风味描述文字将显示在此处...
                </div>
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 6, background: `${defaultTemplate.accentColor}20`, border: `1px solid ${defaultTemplate.accentColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: defaultTemplate.accentColor }}>LOGO</div>
              </div>

              <Button type="primary" block loading={saving}
                style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
                onClick={handleSaveTemplate}>
                保存模板配置
              </Button>
            </div>
          </Spin>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="海报管理" subtitle="查看用户生成的风味海报记录，配置海报模板样式" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} onChange={handleTabChange} />
      </div>
    </div>
  )
}
