import { NavLink } from 'react-router-dom'

export default function Nav({ user, onSignOut }) {
  const links = [
    { to: '/', label: 'dashboard' },
    { to: '/session', label: 'session' },
    { to: '/trades', label: 'trades' },
    { to: '/import', label: 'import' },
    { to: '/patterns', label: 'patterns' },
  ]
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '0 24px', height: 54,
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18,
        color: '#2563eb', letterSpacing: '-0.02em', marginRight: 32, flexShrink: 0,
      }}>TRADELOG</div>
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            padding: '6px 14px', borderRadius: 6, fontSize: 12,
            letterSpacing: '0.04em', textDecoration: 'none',
            color: isActive ? '#2563eb' : '#64748b',
            background: isActive ? '#eff6ff' : 'transparent',
            fontWeight: isActive ? 500 : 400,
            transition: 'all 0.12s',
          })}>{label}</NavLink>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{user?.email?.split('@')[0]}</span>
        <button onClick={onSignOut} style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
          color: '#94a3b8', fontSize: 11, padding: '5px 12px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', transition: 'all 0.12s',
        }}>sign out</button>
      </div>
    </nav>
  )
}
