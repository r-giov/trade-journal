import { useState } from 'react'

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089'

function connectDeriv(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL)
    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }))
    }
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      if (data.error) { ws.close(); reject(data.error.message); return }
      if (data.msg_type === 'authorize') resolve({ ws, data: data.authorize })
    }
    ws.onerror = () => reject('Connection failed')
    setTimeout(() => reject('Timeout'), 10000)
  })
}

function fetchProfitTable(ws, offset = 0) {
  return new Promise((resolve, reject) => {
    ws.send(JSON.stringify({
      profit_table: 1,
      description: 1,
      limit: 100,
      offset,
      sort: 'DESC',
    }))
    const handler = (msg) => {
      const data = JSON.parse(msg.data)
      if (data.msg_type === 'profit_table') {
        ws.removeEventListener('message', handler)
        if (data.error) reject(data.error.message)
        else resolve(data.profit_table)
      }
    }
    ws.addEventListener('message', handler)
    setTimeout(() => reject('Timeout fetching trades'), 15000)
  })
}

function derivTradeToLocal(t, index) {
  const profit = parseFloat(t.sell_price || 0) - parseFloat(t.buy_price || 0)
  const type = (t.transaction_id % 2 === 0) ? 'buy' : 'sell'
  return {
    id: `deriv-${t.transaction_id || index}`,
    openTime: t.purchase_time ? new Date(t.purchase_time * 1000).toISOString().replace('T', ' ').slice(0, 19) : '',
    ticket: String(t.transaction_id || index),
    type,
    volume: parseFloat(t.payout || 0),
    symbol: t.underlying || t.display_name || 'Unknown',
    openPrice: parseFloat(t.buy_price || 0),
    closePrice: parseFloat(t.sell_price || 0),
    sl: '',
    tp: '',
    profit: parseFloat(profit.toFixed(2)),
    outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
  }
}

export default function DerivSync({ onImport, savedToken, onSaveToken }) {
  const [token, setToken] = useState(savedToken || '')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountInfo, setAccountInfo] = useState(null)

  async function handleSync() {
    if (!token.trim()) { setError('Please enter your Deriv API token'); return }
    setLoading(true); setError(''); setStatus('Connecting to Deriv...')
    try {
      const { ws, data: auth } = await connectDeriv(token.trim())
      setAccountInfo({ loginid: auth.loginid, balance: auth.balance, currency: auth.currency })
      setStatus('Fetching trade history...')
      const table = await fetchProfitTable(ws, 0)
      const trades = (table.transactions || []).map(derivTradeToLocal)
      ws.close()
      if (!trades.length) { setStatus('No trades found on this account.'); setLoading(false); return }
      setStatus(`Found ${trades.length} trades. Importing...`)
      await onImport(trades, 'merge')
      onSaveToken(token.trim())
      setStatus(`✓ Synced ${trades.length} trades successfully`)
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to connect. Check your token and try again.')
      setStatus('')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ff444420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>D</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#0f172a' }}>Deriv direct sync</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Connect your Deriv account and pull trades automatically</div>
        </div>
      </div>

      {accountInfo && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#16a34a' }}>✓ {accountInfo.loginid}</span>
          <span style={{ fontSize: 12, color: '#16a34a' }}>{accountInfo.currency} {parseFloat(accountInfo.balance).toFixed(2)}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Deriv API token"
          style={{ flex: 1 }}
        />
        <button onClick={handleSync} disabled={loading} style={{
          padding: '8px 20px', borderRadius: 6, background: '#2563eb', color: '#fff',
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {loading ? 'syncing...' : 'sync trades →'}
        </button>
      </div>

      {status && <div style={{ marginTop: 10, fontSize: 12, color: status.startsWith('✓') ? '#16a34a' : '#2563eb' }}>{status}</div>}
      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca' }}>{error}</div>}

      <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
        Your token is stored locally and only used to read trade data. We never place or modify trades.
        Get your token at app.deriv.com → Account Settings → Security → API token (Read permission only).
      </div>
    </div>
  )
}
