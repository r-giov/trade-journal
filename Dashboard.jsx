import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const EMO_COLOR = { calm:'#16a34a', focused:'#2563eb', anxious:'#d97706', frustrated:'#ea580c', overconfident:'#db2777', fearful:'#7c3aed', revenge:'#ef4444' }

export default function Dashboard({ trades, journalEntries, sessions }) {
  const stats = useMemo(() => {
    if (!trades.length) return null
    const total = trades.reduce((s, t) => s + t.profit, 0)
    const wins = trades.filter(t => t.outcome === 'win')
    const losses = trades.filter(t => t.outcome === 'loss')
    const winRate = trades.length ? wins.length / trades.length * 100 : 0
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0
    const avgLoss = losses.length ? losses.reduce((s, t) => s + t.profit, 0) / losses.length : 0
    const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

    let running = 0
    const equity = trades.map((t, i) => {
      running += t.profit
      return { i: i + 1, pnl: parseFloat(running.toFixed(2)) }
    })

    const emoMap = {}
    trades.forEach(t => {
      const j = journalEntries[t.id]
      if (!j?.emotion) return
      if (!emoMap[j.emotion]) emoMap[j.emotion] = { count: 0, pnl: 0 }
      emoMap[j.emotion].count++
      emoMap[j.emotion].pnl += t.profit
    })
    const emoStats = Object.entries(emoMap)
      .map(([e, v]) => ({ emotion: e, count: v.count, avgPnl: parseFloat((v.pnl / v.count).toFixed(2)) }))
      .sort((a, b) => b.avgPnl - a.avgPnl)

    return { total, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, rr, equity, emoStats }
  }, [trades, journalEntries])

  const journaled = trades.filter(t => journalEntries[t.id]).length

  if (!trades.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', gap: 16, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>NO DATA</div>
      <div style={{ color: 'var(--text2)', fontSize: 13 }}>Import your MT5 report to get started</div>
      <Link to="/import" style={{ marginTop: 8, padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--r)', fontWeight: 500, textDecoration: 'none', fontSize: 13 }}>
        import trades →
      </Link>
    </div>
  )

  const pnlColor = stats.total >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>TOTAL P&L</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, color: pnlColor, lineHeight: 1 }}>
          {stats.total >= 0 ? '+' : ''}{stats.total.toFixed(2)}
        </div>
        <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>{trades.length} trades · {journaled} journaled</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'WIN RATE', value: `${stats.winRate.toFixed(0)}%`, sub: `${stats.wins}W / ${stats.losses}L`, color: 'var(--text)' },
          { label: 'AVG WIN', value: `+${stats.avgWin.toFixed(2)}`, color: 'var(--green)' },
          { label: 'AVG LOSS', value: stats.avgLoss.toFixed(2), color: 'var(--red)' },
          { label: 'AVG R:R', value: stats.rr.toFixed(2), color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>EQUITY CURVE</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={stats.equity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => v.toFixed(2)} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#2563eb' }}
              formatter={v => [v.toFixed(2), 'P&L']}
              labelFormatter={i => `Trade ${i}`}
            />
            <Area type="monotone" dataKey="pnl" stroke="#2563eb" strokeWidth={2} fill="url(#eq)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>EMOTION vs P&L</div>
          {stats.emoStats.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>Journal your trades to see emotional patterns</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.emoStats.map(e => (
                <div key={e.emotion} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: EMO_COLOR[e.emotion] || 'var(--text2)' }}>{e.emotion}</div>
                  <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.abs(e.avgPnl) * 10)}%`, background: e.avgPnl >= 0 ? 'var(--green)' : 'var(--red)', borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 64, fontSize: 12, textAlign: 'right', color: e.avgPnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                    {e.avgPnl >= 0 ? '+' : ''}{e.avgPnl.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', width: 28, textAlign: 'right' }}>×{e.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>RECENT TRADES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {trades.slice(-7).reverse().map(t => {
              const j = journalEntries[t.id]
              return (
                <Link key={t.id} to="/trades" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '7px 10px', borderRadius: 6, background: '#f8fafc', border: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                  <div style={{ fontSize: 11, color: t.type === 'buy' ? 'var(--green)' : 'var(--red)', width: 14 }}>{t.type === 'buy' ? '↑' : '↓'}</div>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{t.symbol}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.openTime?.slice(5, 10)}</div>
                  {j?.emotion && <div style={{ fontSize: 10, color: EMO_COLOR[j.emotion] || 'var(--text3)', padding: '1px 6px', borderRadius: 100, background: '#f1f5f9' }}>{j.emotion}</div>}
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
