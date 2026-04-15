import { NavLink } from 'react-router-dom'

export default function Nav() {
  const links = [
    { to: '/', label: 'dashboard' },
    { to: '/session', label: 'session' },
    { to: '/trades', label: 'trades' },
    { to: '/analytics', label: 'analytics' },
    { to: '/import', label: 'import' },
  ]
  return (
    <nav style={{ display:'flex', alignItems:'center', padding:'0 24px', height:54, borderBottom:'1px solid #e2e8f0', background:'#fff', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:'#2563eb', letterSpacing:'-.02em', marginRight:32, flexShrink:0 }}>TRADELOG</div>
      <div style={{ display:'flex', gap:2 }}>
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
            padding:'6px 14px', borderRadius:6, fontSize:12, letterSpacing:'.04em', textDecoration:'none',
            color: isActive ? '#2563eb' : '#64748b',
            background: isActive ? '#eff6ff' : 'transparent',
            fontWeight: isActive ? 500 : 400, transition:'all .12s',
          })}>{label}</NavLink>
        ))}
      </div>
    </nav>
  )
}
