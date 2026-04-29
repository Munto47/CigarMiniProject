import { Tooltip } from 'antd'

const vipGradient = 'linear-gradient(135deg, #E8C97A, #C9A84C)'
const cigarGradient = 'linear-gradient(135deg, #B8956A, #8B6B4A)'

const vipIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
  </svg>
)

const cigarIcon = (
  <svg width="13" height="9" viewBox="0 0 24 16" fill="currentColor" style={{ flexShrink: 0 }}>
    <rect x="2" y="3" width="20" height="10" rx="5" />
    <rect x="1" y="4" width="4" height="8" rx="2" fill="#C94C4C" />
    <line x1="6" y1="3" x2="6" y2="13" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
  </svg>
)

export default function MemberLevelBadge({ type, level, showIcon = true, size = 'default' }) {
  const isRecharge = type === 'recharge'
  const gradient = isRecharge ? vipGradient : cigarGradient
  const icon = isRecharge ? vipIcon : cigarIcon
  const label = isRecharge ? '充值等级' : '消费等级'

  const padding = size === 'small' ? '1px 7px' : '2px 10px'
  const fontSize = size === 'small' ? 11 : 12
  const gap = size === 'small' ? 4 : 5

  return (
    <Tooltip title={`${label} V${level}`}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap,
          padding,
          borderRadius: 999,
          background: gradient,
          color: '#1A1208',
          fontWeight: 700,
          fontSize,
          lineHeight: '18px',
          whiteSpace: 'nowrap',
          cursor: 'default',
        }}
      >
        {showIcon && icon}
        V{level}
      </span>
    </Tooltip>
  )
}
