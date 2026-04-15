import { createContext, useContext, useState, useCallback } from 'react'

const Ctx = createContext(null)

export function useToast() { return useContext(Ctx) }

const STYLES = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#ef4444', icon: '✕' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', icon: 'ℹ' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = (id) => setToasts(p => p.filter(t => t.id !== id))

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const s = STYLES[t.type] || STYLES.success
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px',
                borderRadius: 10,
                background: s.bg,
                border: `1px solid ${s.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                minWidth: 260, maxWidth: 380,
                pointerEvents: 'all',
                cursor: 'pointer',
                animation: 'toastIn 0.2s ease',
              }}
            >
              <span style={{ fontSize: 13, color: s.color, fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: s.color, fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>{t.msg}</span>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
