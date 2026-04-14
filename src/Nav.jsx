import { NavLink } from 'react-router-dom';

export default function Nav() {
  const links = [
    { to: '/', label: 'dashboard' },
    { to: '/import', label: 'import' },
    { to: '/trades', label: 'trades' },
    { to: '/patterns', label: 'patterns' },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '0 24px',
      height: 52,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg1)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 18,
        color: 'var(--accent)',
        letterSpacing: '-0.02em',
        marginRight: 36,
        flexShrink: 0,
      }}>
        TRADELOG
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              padding: '6px 14px',
              borderRadius: 'var(--r)',
              fontSize: 12,
              letterSpacing: '0.06em',
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'rgba(200,240,96,0.08)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
