import { Typography, Space, Breadcrumb } from 'antd'
import { HomeOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function PageHeader({ title, subtitle, breadcrumbs = [], extra }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={[
            { title: <HomeOutlined style={{ color: '#9E9484' }} /> },
            ...breadcrumbs.map(b => ({ title: <span style={{ color: '#9E9484', fontSize: 12 }}>{b}</span> })),
            { title: <span style={{ color: '#C9A84C', fontSize: 12 }}>{title}</span> },
          ]}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: '#C9A84C',
            letterSpacing: '0.05em', lineHeight: 1.3,
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 13, color: '#9E9484', marginTop: 4 }}>{subtitle}</div>
          )}
        </div>
        {extra && <Space>{extra}</Space>}
      </div>
    </div>
  )
}
