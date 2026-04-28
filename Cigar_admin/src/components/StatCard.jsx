import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

export default function StatCard({ title, value, prefix, suffix, trend, trendLabel, icon, color = '#C9A84C' }) {
  const trendUp = trend > 0

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: '#9E9484', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#F5F0E8', lineHeight: 1.2 }}>
            {prefix && <span style={{ fontSize: 16, color }}>{prefix}</span>}
            {value}
            {suffix && <span style={{ fontSize: 14, color: '#9E9484', marginLeft: 4 }}>{suffix}</span>}
          </div>
          {trend !== undefined && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              {trendUp
                ? <ArrowUpOutlined style={{ color: '#4CAF7A', fontSize: 12 }} />
                : <ArrowDownOutlined style={{ color: '#C94C4C', fontSize: 12 }} />
              }
              <span style={{ fontSize: 12, color: trendUp ? '#4CAF7A' : '#C94C4C', fontWeight: 600 }}>
                {Math.abs(trend)}%
              </span>
              {trendLabel && <span style={{ fontSize: 12, color: '#6B6560' }}>{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
