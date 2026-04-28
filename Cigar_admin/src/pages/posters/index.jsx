import { useState } from 'react'
import { Table, Button, Tabs, Form, Input, Select, Upload, message, Divider } from 'antd'
import { UploadOutlined, EyeOutlined } from '@ant-design/icons'
import { mockPosters, mockPosterTemplate } from '../../mock/posters'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'

const { Option } = Select

export default function Posters() {
  const [template, setTemplate] = useState(mockPosterTemplate)
  const [form] = Form.useForm()

  const columns = [
    {
      title: '用户', dataIndex: 'userName', key: 'userName', width: 100,
      render: v => <span style={{ color: '#F5F0E8' }}>{v}</span>,
    },
    {
      title: '雪茄', dataIndex: 'cigarName', key: 'cigarName', width: 200,
      render: v => <span style={{ color: '#C9A84C', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '风味标签', dataIndex: 'flavors', key: 'flavors',
      render: v => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {v.map(f => (
            <span key={f} style={{ fontSize: 11, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', padding: '1px 8px', borderRadius: 999, border: '1px solid rgba(201,168,76,0.2)' }}>{f}</span>
          ))}
        </div>
      ),
    },
    {
      title: '语音描述', dataIndex: 'transcript', key: 'transcript',
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v.length > 40 ? v.slice(0, 40) + '...' : v}</span>,
    },
    { title: '生成时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: () => <StatusBadge type="success" dot>已生成</StatusBadge>,
    },
    {
      title: '操作', key: 'action', width: 80,
      render: () => <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#C9A84C' }} onClick={() => message.info('海报预览（待后端接入图片）')} />,
    },
  ]

  const BG_COLORS = ['#0D0D0D', '#1A0A00', '#000D1A', '#0A0D00']
  const ACCENT_COLORS = ['#C9A84C', '#4C7AC9', '#4CAF7A', '#C94C4C']
  const FONT_STYLES = [{ value: 'classic', label: '经典衬线' }, { value: 'modern', label: '现代无衬线' }, { value: 'elegant', label: '优雅细线' }]

  const tabItems = [
    {
      key: 'records', label: '海报记录',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Table dataSource={mockPosters} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
    {
      key: 'template', label: '海报模板配置',
      children: (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>商家 LOGO</div>
              <Upload beforeUpload={() => { message.info('LOGO上传待后端接入'); return false; }} showUploadList={false}>
                <Button icon={<UploadOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
                  上传 LOGO（支持 PNG/SVG，建议透明背景）
                </Button>
              </Upload>
              <div style={{ color: '#6B6560', fontSize: 12, marginTop: 6 }}>LOGO 将固定显示在海报右上角</div>
            </div>
            <Divider style={{ borderColor: 'rgba(201,168,76,0.12)', margin: '16px 0' }} />

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>海报背景色</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {BG_COLORS.map(c => (
                  <div key={c} onClick={() => setTemplate(t => ({ ...t, bgColor: c }))} style={{
                    width: 48, height: 48, borderRadius: 10, background: c, cursor: 'pointer',
                    border: template.bgColor === c ? '2px solid #C9A84C' : '2px solid rgba(201,168,76,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {template.bgColor === c && <span style={{ color: '#C9A84C', fontSize: 18 }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>主题色（文字/边框）</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {ACCENT_COLORS.map(c => (
                  <div key={c} onClick={() => setTemplate(t => ({ ...t, accentColor: c }))} style={{
                    width: 48, height: 48, borderRadius: 10, background: c, cursor: 'pointer',
                    border: template.accentColor === c ? '2px solid #F5F0E8' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {template.accentColor === c && <span style={{ color: '#fff', fontSize: 18 }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>字体风格</div>
              <Select value={template.fontStyle} onChange={v => setTemplate(t => ({ ...t, fontStyle: v }))} style={{ width: '100%' }}>
                {FONT_STYLES.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
              </Select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>俱乐部名称</div>
              <Input value={template.clubName} onChange={e => setTemplate(t => ({ ...t, clubName: e.target.value }))} style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 10 }}>海报宣传语</div>
              <Input value={template.tagline} onChange={e => setTemplate(t => ({ ...t, tagline: e.target.value }))} style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
            </div>

            {/* 海报预览 */}
            <div style={{ background: template.bgColor, border: `2px solid ${template.accentColor}30`, borderRadius: 12, padding: 20, marginBottom: 20, aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ color: template.accentColor, fontSize: 10, letterSpacing: '0.3em', marginBottom: 8, opacity: 0.6 }}>FLAVOR PROFILE</div>
              <div style={{ color: template.accentColor, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>{template.clubName}</div>
              <div style={{ color: template.accentColor, fontSize: 10, opacity: 0.6, marginBottom: 24 }}>{template.tagline}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
                {['雪松木', '咖啡可可', '泥土矿物'].map(f => (
                  <span key={f} style={{ fontSize: 11, color: template.accentColor, border: `1px solid ${template.accentColor}50`, padding: '2px 10px', borderRadius: 999 }}>{f}</span>
                ))}
              </div>
              <div style={{ color: template.accentColor, opacity: 0.4, fontSize: 10, textAlign: 'center', padding: '0 20px' }}>
                风味描述文字将显示在此处...
              </div>
              <div style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 6, background: `${template.accentColor}20`, border: `1px solid ${template.accentColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: template.accentColor }}>LOGO</div>
            </div>

            <Button type="primary" block style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
              onClick={() => message.success('模板配置已保存')}>
              保存模板配置
            </Button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="海报管理" subtitle="查看用户生成的风味海报记录，配置海报模板样式" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} />
      </div>
    </div>
  )
}
