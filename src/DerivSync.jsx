import { useState } from 'react'
import { derivFetchAccount } from './deriv'

export default function DerivSync({ onBalanceSynced }) {
  const [token, setToken] = useState(() => localStorage.getItem('deriv_api_token') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(!localStorage.getItem('deriv_api_token'))

  const savedBalance = localStorage.getItem('deriv_last_balance')
  const savedCurrency = localStorage.getItem('deriv_last_currency') || 'USD'
  const savedLogin = localStorage.getItem('deriv_last_login') || ''

  async function handleSync() {
    if (!token.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await derivFetchAccount(token.trim())
      localStorage.setItem('deriv_api_token', token.trim())
      localStorage.setItem('deriv_last_balance', data.balance)
      localStorage.setItem('deriv_last_currency', data.currency)
      localStorage.setItem('deriv_last_login', data.mt5Accounts[0]?.login || '')
      setResult(data)
      setExpanded(false)
      // Auto-set starting balance in Analytics
      const startingBalance = data.balance + Math.abs(parseFloat(localStorage.getItem('tj_total_pnl') || '0'))
      onBalanceSynced(data.balance, startingBalance)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDisconnect() {
    localStorage.removeItem('deriv_api_token')
    localStorage.removeItem('deriv_last_balance')
    localStorage.removeItem('deriv_last_currency')
    localStorage.removeItem('deriv_last_login')
    setToken('')
    setResult(null)
    setExpanded(true)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Deriv account sync</div>
          {savedBalance ? (
            <div style={{ fontSize: 11, color: '#16a34a' }}>
              ✓ {savedLogin && `MT5 ${savedLogin} · `}{savedCurrency} {parseFloat(savedBalance).toFixed(2)} — balance synced
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Auto-sync your MT5 balance to fix equity curve & drawdown %</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {savedBalance && (
            <button onClick={handleDisconnect} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, background: 'transparent', border: '1px solid #e2e8f0', color: '#94a3b8', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              disconnect
            </button>
          )}
          <button onClick={() => setExpanded(s => !s)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            {expanded ? 'cancel' : savedBalance ? 're-sync' : 'connect →'}
          </button>
        </div>
      </div>

      {/* Expanded: token input */}
      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8, marginBottom: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
            <strong>How to get your token:</strong><br />
            1. Go to <strong>app.deriv.com</strong> → click your account name → <strong>Settings</strong><br />
            2. Open <strong>Security &amp; Safety</strong> → <strong>API Token</strong><br />
            3. Create a token with <strong>"Read"</strong> scope → copy it
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              placeholder="Paste Deriv API token here..."
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSync()}
              style={{ flex: 1, fontSize: 12 }}
              autoFocus
            />
            <button
              onClick={handleSync}
              disabled={loading || !token.trim()}
              style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
                border: 'none', cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'connecting...' : 'sync balance →'}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
            Token is stored in your browser only. Read-only — we never place or modify trades.
          </div>
        </div>
      )}

      {/* Success state */}
      {result && !expanded && (
        <div style={{ marginTop: 14 }}>
          {result.mt5Accounts.map(a => (
            <div key={a.login} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>MT5 — {a.login}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{a.group} · {a.leverage}x leverage</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                {a.currency} {a.balance?.toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#16a34a' }}>
            ✓ Starting balance updated in Analytics — equity curve and drawdown % are now accurate
          </div>
        </div>
      )}
    </div>
  )
}
