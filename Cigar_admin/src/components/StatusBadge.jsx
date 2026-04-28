const colorMap = {
  success: { bg: 'rgba(76,175,122,0.15)', color: '#4CAF7A', border: 'rgba(76,175,122,0.3)' },
  warning: { bg: 'rgba(232,160,76,0.15)', color: '#E8A04C', border: 'rgba(232,160,76,0.3)' },
  danger: { bg: 'rgba(201,76,76,0.15)', color: '#C94C4C', border: 'rgba(201,76,76,0.3)' },
  gold: { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: 'rgba(201,168,76,0.3)' },
  default: { bg: 'rgba(158,148,132,0.12)', color: '#9E9484', border: 'rgba(158,148,132,0.25)' },
  blue: { bg: 'rgba(76,122,201,0.15)', color: '#4C7AC9', border: 'rgba(76,122,201,0.3)' },
  silver: { bg: 'rgba(160,160,176,0.15)', color: '#A0A0B0', border: 'rgba(160,160,176,0.3)' },
}

export default function StatusBadge({ type = 'default', children, dot = false }) {
  const style = colorMap[type] || colorMap.default
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500,
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
      whiteSpace: 'nowrap',
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: style.color, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  )
}
