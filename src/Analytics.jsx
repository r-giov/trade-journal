import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie, Legend,
  AreaChart, Area, ReferenceLine,
} from 'recharts'

const CARD = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const TIP = {
  contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  labelStyle: { color: '#94a3b8' },
}
const EMO_COLORS = { calm: '#16a34a', focused: '#2563eb', anxious: '#d97706', frustrated: '#ea580c', overconfident: '#db2777', fearful: '#7c3aed', revenge: '#ef4444' }

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '.08em', marginBottom: 14 }}>{children}</div>
}

function parseDate(s) {
  if (!s) return null
  const clean = s.replace(/\./g, '-').slice(0, 10)
  const d = new Date(clean)
  return isNaN(d) ? null : d
}

function tradeDuration(t) {
  if (!t.openTime || !t.closeTime) return null
  const fmt = s => s.replace(/\./g, '-').replace(' ', 'T')
  const open = new Date(fmt(t.openTime))
  const close = new Date(fmt(t.closeTime))
  if (isNaN(open) || isNaN(close)) return null
  return (close - open) / 60000
}

export default function Analytics({ trades, journalEntries = {}, sessions = [] }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [startingBalance, setStartingBalance] = useState(() => {
    const v = localStorage.getItem('tj_starting_balance')
    return v ? parseFloat(v) : ''
  })
  const [balanceInput, setBalanceInput] = useState(() => localStorage.getItem('tj_starting_balance') || '')

  function saveBalance(val) {
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) {
      localStorage.setItem('tj_starting_balance', n)
      setStartingBalance(n)
    } else {
      localStorage.removeItem('tj_starting_balance')
      setStartingBalance('')
    }
  }

  const data = useMemo(() => {
    const base = startingBalance || 0
    if (!trades.length) return null
    const closed = trades.filter(t => t.outcome !== 'be' || t.closePrice)
    const wins = closed.filter(t => t.outcome === 'win')
    const losses = closed.filter(t => t.outcome === 'loss')
    const bes = closed.filter(t => t.outcome === 'be')

    const grossProfit = wins.reduce((s, t) => s + t.profit, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit, 0))
    const total = grossProfit - grossLoss
    const winRate = closed.length ? wins.length / closed.length * 100 : 0
    const avgWin = wins.length ? grossProfit / wins.length : 0
    const avgLoss = losses.length ? grossLoss / losses.length : 0
    const rr = avgLoss ? avgWin / avgLoss : 0
    const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss)
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

    // Equity + drawdown — uses starting balance if set, otherwise dollar-only
    let peakEquity = base, running = 0, maxDD = 0, maxDDdollar = 0
    const equity = closed.map((t, i) => {
      running += t.profit
      const equity = base + running
      if (equity > peakEquity) peakEquity = equity
      const ddDollar = peakEquity - equity
      const ddPct = peakEquity > 0 ? (ddDollar / peakEquity) * 100 : 0
      if (ddPct > maxDD) maxDD = ddPct
      if (ddDollar > maxDDdollar) maxDDdollar = ddDollar
      return { i: i + 1, pnl: parseFloat((base + running).toFixed(2)), dd: parseFloat(ddPct.toFixed(2)) }
    })
    const recoveryFactor = maxDDdollar > 0 ? total / maxDDdollar : 0

    // Best / worst
    const sortedByProfit = [...closed].sort((a, b) => b.profit - a.profit)
    const bestTrade = sortedByProfit[0]
    const worstTrade = sortedByProfit[sortedByProfit.length - 1]

    // Rolling win rate (20-trade window)
    const rollingWR = closed.map((_, i) => {
      if (i < 9) return null
      const slice = closed.slice(Math.max(0, i - 19), i + 1)
      const wr = slice.filter(t => t.outcome === 'win').length / slice.length * 100
      return { i: i + 1, wr: parseFloat(wr.toFixed(1)) }
    }).filter(Boolean)

    // Monthly P&L
    const monthMap = {}
    closed.forEach(t => {
      const d = parseDate(t.openTime)
      if (!d) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = { pnl: 0, wins: 0, count: 0 }
      monthMap[key].pnl += t.profit
      monthMap[key].count++
      if (t.outcome === 'win') monthMap[key].wins++
    })
    const byMonth = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({
      month: m.slice(5) + '/' + m.slice(2, 4),
      pnl: parseFloat(v.pnl.toFixed(2)),
      winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
      count: v.count,
    }))

    // By symbol
    const symMap = {}
    closed.forEach(t => {
      if (!symMap[t.symbol]) symMap[t.symbol] = { wins: 0, losses: 0, pnl: 0, count: 0 }
      symMap[t.symbol].count++
      symMap[t.symbol].pnl += t.profit
      if (t.outcome === 'win') symMap[t.symbol].wins++
      else if (t.outcome === 'loss') symMap[t.symbol].losses++
    })
    const bySymbol = Object.entries(symMap)
      .map(([sym, v]) => ({
        symbol: sym, count: v.count,
        pnl: parseFloat(v.pnl.toFixed(2)),
        winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
        avgPnl: parseFloat((v.pnl / v.count).toFixed(2)),
      }))
      .sort((a, b) => b.pnl - a.pnl)

    // By hour
    const hourMap = {}
    closed.forEach(t => {
      const h = t.openTime?.slice(11, 13)
      if (!h) return
      if (!hourMap[h]) hourMap[h] = { wins: 0, pnl: 0, count: 0 }
      hourMap[h].count++
      hourMap[h].pnl += t.profit
      if (t.outcome === 'win') hourMap[h].wins++
    })
    const byHour = Object.entries(hourMap).sort(([a], [b]) => a.localeCompare(b)).map(([h, v]) => ({
      hour: h + ':00', count: v.count,
      pnl: parseFloat(v.pnl.toFixed(2)),
      winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
    }))

    // By day
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayMap = {}
    closed.forEach(t => {
      const d = parseDate(t.openTime)
      if (!d) return
      const day = days[d.getDay()]
      if (!dayMap[day]) dayMap[day] = { wins: 0, pnl: 0, count: 0 }
      dayMap[day].count++
      dayMap[day].pnl += t.profit
      if (t.outcome === 'win') dayMap[day].wins++
    })
    const byDay = days.filter(d => dayMap[d]).map(d => ({
      day: d, count: dayMap[d].count,
      pnl: parseFloat(dayMap[d].pnl.toFixed(2)),
      winRate: parseFloat((dayMap[d].wins / dayMap[d].count * 100).toFixed(0)),
    }))

    // By lot size
    const volMap = {}
    closed.forEach(t => {
      const v = String(t.volume)
      if (!volMap[v]) volMap[v] = { wins: 0, pnl: 0, count: 0 }
      volMap[v].count++
      volMap[v].pnl += t.profit
      if (t.outcome === 'win') volMap[v].wins++
    })
    const byVolume = Object.entries(volMap).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([v, d]) => ({
      volume: v, count: d.count,
      pnl: parseFloat(d.pnl.toFixed(2)),
      winRate: parseFloat((d.wins / d.count * 100).toFixed(0)),
    }))

    // Streaks
    let curStreak = 0, maxWinStreak = 0, maxLossStreak = 0, curType = null
    closed.forEach(t => {
      if (t.outcome === 'win') {
        if (curType === 'win') curStreak++; else { curStreak = 1; curType = 'win' }
        if (curStreak > maxWinStreak) maxWinStreak = curStreak
      } else if (t.outcome === 'loss') {
        if (curType === 'loss') curStreak++; else { curStreak = 1; curType = 'loss' }
        if (curStreak > maxLossStreak) maxLossStreak = curStreak
      }
    })

    // Trade frequency
    const tradeDates = new Set(closed.map(t => parseDate(t.openTime)?.toDateString()).filter(Boolean))
    const tradingDays = tradeDates.size
    const tradesPerDay = tradingDays ? (closed.length / tradingDays).toFixed(1) : null

    // Pie
    const pie = [
      { name: 'Wins', value: wins.length, color: '#16a34a' },
      { name: 'Losses', value: losses.length, color: '#ef4444' },
      { name: 'Break even', value: bes.length, color: '#94a3b8' },
    ].filter(p => p.value > 0)

    // Emotion analytics (from trade journal entries)
    const emoMap = {}
    closed.forEach(t => {
      const j = journalEntries[t.id]
      if (!j?.emotion) return
      if (!emoMap[j.emotion]) emoMap[j.emotion] = { count: 0, wins: 0, pnl: 0 }
      emoMap[j.emotion].count++
      emoMap[j.emotion].pnl += t.profit
      if (t.outcome === 'win') emoMap[j.emotion].wins++
    })
    const byEmotion = Object.entries(emoMap).map(([e, v]) => ({
      emotion: e, count: v.count,
      avgPnl: parseFloat((v.pnl / v.count).toFixed(2)),
      winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
      totalPnl: parseFloat(v.pnl.toFixed(2)),
    })).sort((a, b) => b.avgPnl - a.avgPnl)

    // Mistake analytics
    const mistakeMap = {}
    closed.forEach(t => {
      const j = journalEntries[t.id]
      if (!j?.mistakes?.length) return
      j.mistakes.forEach(m => {
        if (!mistakeMap[m]) mistakeMap[m] = { count: 0, wins: 0, pnl: 0 }
        mistakeMap[m].count++
        mistakeMap[m].pnl += t.profit
        if (t.outcome === 'win') mistakeMap[m].wins++
      })
    })
    const byMistake = Object.entries(mistakeMap).map(([m, v]) => ({
      mistake: m, count: v.count,
      totalPnl: parseFloat(v.pnl.toFixed(2)),
      avgPnl: parseFloat((v.pnl / v.count).toFixed(2)),
      winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
    })).sort((a, b) => a.totalPnl - b.totalPnl)

    // Setup grade analytics
    const gradeMap = {}
    closed.forEach(t => {
      const j = journalEntries[t.id]
      if (!j?.setupGrade) return
      if (!gradeMap[j.setupGrade]) gradeMap[j.setupGrade] = { count: 0, wins: 0, pnl: 0 }
      gradeMap[j.setupGrade].count++
      gradeMap[j.setupGrade].pnl += t.profit
      if (t.outcome === 'win') gradeMap[j.setupGrade].wins++
    })
    const byGrade = Object.entries(gradeMap).sort(([a], [b]) => a.localeCompare(b)).map(([g, v]) => ({
      grade: g, count: v.count,
      avgPnl: parseFloat((v.pnl / v.count).toFixed(2)),
      winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
      totalPnl: parseFloat(v.pnl.toFixed(2)),
    }))

    // Session pre-emotion vs day performance
    const sessionMap = {}
    sessions.forEach(s => { sessionMap[s.date] = s })
    const sessionEmoMap = {}
    closed.forEach(t => {
      const d = t.openTime?.slice(0, 10)?.replace(/\./g, '-')
      const s = sessionMap[d]
      if (!s?.preEmotion) return
      if (!sessionEmoMap[s.preEmotion]) sessionEmoMap[s.preEmotion] = { count: 0, wins: 0, pnl: 0 }
      sessionEmoMap[s.preEmotion].count++
      sessionEmoMap[s.preEmotion].pnl += t.profit
      if (t.outcome === 'win') sessionEmoMap[s.preEmotion].wins++
    })
    const bySessionEmotion = Object.entries(sessionEmoMap).map(([e, v]) => ({
      emotion: e, count: v.count,
      avgPnl: parseFloat((v.pnl / v.count).toFixed(2)),
      winRate: parseFloat((v.wins / v.count * 100).toFixed(0)),
    })).sort((a, b) => b.avgPnl - a.avgPnl)

    return {
      closed, wins, losses, total, winRate, avgWin, avgLoss, rr, expectancy,
      profitFactor, grossProfit, grossLoss, maxDD, maxDDdollar, recoveryFactor,
      equity, byMonth, bySymbol, byHour, byDay, byVolume, pie,
      maxWinStreak, maxLossStreak, rollingWR, tradesPerDay, tradingDays,
      bestTrade, worstTrade, byEmotion, byMistake, byGrade, bySessionEmotion,
    }
  }, [trades, journalEntries, sessions, startingBalance])

  if (!trades.length || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#e2e8f0' }}>NO DATA</div>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>Import your trades to see analytics</div>
    </div>
  )

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'timing', label: 'Timing' },
    { id: 'psychology', label: 'Psychology' },
    { id: 'symbols', label: 'Symbols' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Analytics</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{data.closed.length} closed trades across {data.tradingDays} trading days</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>starting balance</div>
          <input
            type="number" min="0" step="1" placeholder="e.g. 150"
            value={balanceInput}
            onChange={e => setBalanceInput(e.target.value)}
            onBlur={e => saveBalance(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveBalance(e.target.value)}
            style={{ width: 110, fontSize: 12, padding: '6px 10px' }}
          />
          {startingBalance && <div style={{ fontSize: 11, color: '#16a34a' }}>✓ set</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', fontSize: 12, fontFamily: 'var(--font-mono)',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${activeTab === t.id ? '#2563eb' : 'transparent'}`,
            color: activeTab === t.id ? '#2563eb' : '#94a3b8',
            marginBottom: -1, transition: 'all .12s',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'TOTAL P&L', value: `${data.total >= 0 ? '+' : ''}${data.total.toFixed(2)}`, color: data.total >= 0 ? '#16a34a' : '#ef4444' },
              { label: 'WIN RATE', value: `${data.winRate.toFixed(0)}%`, sub: `${data.wins.length}W / ${data.losses.length}L` },
              { label: 'EXPECTANCY', value: `${data.expectancy >= 0 ? '+' : ''}${data.expectancy.toFixed(2)}`, sub: 'per trade', color: data.expectancy >= 0 ? '#16a34a' : '#ef4444' },
              { label: 'PROFIT FACTOR', value: data.profitFactor >= 999 ? 'inf' : data.profitFactor.toFixed(2), color: data.profitFactor >= 1.5 ? '#16a34a' : data.profitFactor >= 1 ? '#d97706' : '#ef4444', sub: data.profitFactor >= 1.5 ? 'excellent' : data.profitFactor >= 1 ? 'positive' : 'negative edge' },
              { label: 'AVG WIN', value: `+${data.avgWin.toFixed(2)}`, color: '#16a34a' },
              { label: 'AVG LOSS', value: `-${data.avgLoss.toFixed(2)}`, color: '#ef4444' },
              { label: 'RISK:REWARD', value: data.rr.toFixed(2), sub: 'avg R:R' },
              { label: 'MAX DRAWDOWN', value: startingBalance ? `${data.maxDD.toFixed(1)}%` : `-$${data.maxDDdollar.toFixed(2)}`, sub: startingBalance ? `-$${data.maxDDdollar.toFixed(2)}` : 'set balance for %', color: data.maxDD > 20 ? '#ef4444' : data.maxDD > 10 ? '#d97706' : '#16a34a' },
              { label: 'RECOVERY FACTOR', value: data.recoveryFactor.toFixed(2), color: data.recoveryFactor >= 3 ? '#16a34a' : data.recoveryFactor >= 1 ? '#d97706' : '#ef4444', sub: 'profit / drawdown' },
              { label: 'WIN STREAK', value: `${data.maxWinStreak}`, sub: 'best run' },
              { label: 'LOSS STREAK', value: `${data.maxLossStreak}`, sub: 'worst run', color: data.maxLossStreak >= 5 ? '#ef4444' : '#d97706' },
              { label: 'TRADES / DAY', value: data.tradesPerDay || '-', sub: `over ${data.tradingDays} days` },
            ].map(s => (
              <div key={s.label} style={CARD}>
                <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '.08em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: s.color || '#0f172a', lineHeight: 1 }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {(data.bestTrade || data.worstTrade) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'BEST TRADE', trade: data.bestTrade, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                { label: 'WORST TRADE', trade: data.worstTrade, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
              ].map(({ label, trade, color, bg, border }) => trade && (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '.08em', marginBottom: 8 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color }}>{trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{trade.symbol} {trade.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{trade.openTime?.slice(0, 16)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ ...CARD, marginBottom: 16 }}>
            <SectionTitle>EQUITY CURVE</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.equity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'P&L']} labelFormatter={i => `Trade ${i}`} />
                <ReferenceLine y={0} stroke="#e2e8f0" />
                <Area type="monotone" dataKey="pnl" stroke="#2563eb" strokeWidth={2} fill="url(#eq)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={CARD}>
              <SectionTitle>MONTHLY P&L</SectionTitle>
              {data.byMonth.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>Not enough date data</div>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={data.byMonth} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'P&L']} />
                    <ReferenceLine y={0} stroke="#e2e8f0" />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                      {data.byMonth.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#16a34a' : '#ef4444'} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={CARD}>
              <SectionTitle>OUTCOME SPLIT</SectionTitle>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={data.pie} cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                    {data.pie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...TIP} />
                  <Legend iconSize={8} iconType="circle" formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.rollingWR.length > 0 && (
            <div style={{ ...CARD, marginBottom: 16 }}>
              <SectionTitle>ROLLING WIN RATE (20-TRADE WINDOW)</SectionTitle>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data.rollingWR} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={32} tickFormatter={v => v + '%'} />
                  <Tooltip {...TIP} formatter={v => [`${v}%`, 'Win Rate']} labelFormatter={i => `Trade ${i}`} />
                  <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="wr" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={CARD}>
            <SectionTitle>DRAWDOWN OVER TIME</SectionTitle>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={data.equity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${v.toFixed(0)}%`} reversed />
                <Tooltip {...TIP} formatter={v => [`${v.toFixed(2)}%`, 'Drawdown']} labelFormatter={i => `Trade ${i}`} />
                <Line type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeTab === 'timing' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={CARD}>
              <SectionTitle>P&L BY HOUR OF DAY</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.byHour} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'P&L']} />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {data.byHour.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#16a34a' : '#ef4444'} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {data.byHour.map(h => (
                  <span key={h.hour} style={{ padding: '3px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 100, fontSize: 10, color: '#64748b' }}>
                    {h.hour} · {h.winRate}% · {h.count}x
                  </span>
                ))}
              </div>
            </div>
            <div style={CARD}>
              <SectionTitle>P&L BY DAY OF WEEK</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.byDay} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'P&L']} />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {data.byDay.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#2563eb' : '#ef4444'} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {data.byDay.map(d => (
                  <span key={d.day} style={{ padding: '3px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 100, fontSize: 10, color: '#64748b' }}>
                    {d.day} · {d.winRate}% WR · {d.count}x
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={CARD}>
              <SectionTitle>P&L BY LOT SIZE</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.byVolume} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="volume" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'P&L']} />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {data.byVolume.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#2563eb' : '#ef4444'} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={CARD}>
              <SectionTitle>GROSS PROFIT vs GROSS LOSS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {[
                  { label: 'Gross profit', value: data.grossProfit, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Gross loss', value: -data.grossLoss, color: '#ef4444', bg: '#fef2f2' },
                  { label: 'Net P&L', value: data.total, color: data.total >= 0 ? '#16a34a' : '#ef4444', bg: '#f8fafc' },
                  { label: 'Profit factor', value: data.profitFactor >= 999 ? null : data.profitFactor, display: data.profitFactor >= 999 ? 'inf' : data.profitFactor.toFixed(2), color: data.profitFactor >= 1.5 ? '#16a34a' : data.profitFactor >= 1 ? '#d97706' : '#ef4444', bg: '#eff6ff' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: row.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: row.color }}>
                      {row.display || (row.value >= 0 ? '+' : '') + row.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'psychology' && (
        <>
          {Object.keys(journalEntries).length === 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '16px 20px', marginBottom: 20, fontSize: 13, color: '#2563eb' }}>
              Journal your trades to unlock psychological insights. Go to Trades, click any row, and tag your emotion and mistakes.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={CARD}>
              <SectionTitle>TRADE EMOTION vs AVG P&L</SectionTitle>
              {data.byEmotion.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }}>Tag emotions on individual trades to see this</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.byEmotion} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="emotion" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={78} />
                      <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'Avg P&L']} />
                      <ReferenceLine x={0} stroke="#e2e8f0" />
                      <Bar dataKey="avgPnl" radius={[0, 3, 3, 0]}>
                        {data.byEmotion.map((e, i) => <Cell key={i} fill={EMO_COLORS[e.emotion] || '#2563eb'} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                    {data.byEmotion.map(e => (
                      <span key={e.emotion} style={{ padding: '3px 8px', background: (EMO_COLORS[e.emotion] || '#2563eb') + '15', border: `1px solid ${(EMO_COLORS[e.emotion] || '#2563eb')}30`, borderRadius: 100, fontSize: 10, color: EMO_COLORS[e.emotion] || '#2563eb' }}>
                        {e.emotion} · {e.winRate}% WR · {e.count}x
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={CARD}>
              <SectionTitle>SESSION MOOD vs DAY PERFORMANCE</SectionTitle>
              {data.bySessionEmotion.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }}>Log pre-session emotions in Session Journal to see this</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.bySessionEmotion} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="emotion" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={78} />
                      <Tooltip {...TIP} formatter={v => [v.toFixed(2), 'Avg P&L']} />
                      <ReferenceLine x={0} stroke="#e2e8f0" />
                      <Bar dataKey="avgPnl" radius={[0, 3, 3, 0]}>
                        {data.bySessionEmotion.map((e, i) => <Cell key={i} fill={EMO_COLORS[e.emotion] || '#2563eb'} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                    {data.bySessionEmotion.map(e => (
                      <span key={e.emotion} style={{ padding: '3px 8px', background: (EMO_COLORS[e.emotion] || '#2563eb') + '15', border: `1px solid ${(EMO_COLORS[e.emotion] || '#2563eb')}30`, borderRadius: 100, fontSize: 10, color: EMO_COLORS[e.emotion] || '#2563eb' }}>
                        {e.emotion} · {e.winRate}% WR · {e.count} trades
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ ...CARD, marginBottom: 16 }}>
            <SectionTitle>MISTAKE COST ANALYSIS</SectionTitle>
            {data.byMistake.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 12 }}>Tag mistakes on trades in the journal to see their impact</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.byMistake.map(m => (
                  <div key={m.mistake} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{m.mistake}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{m.count} time{m.count !== 1 ? 's' : ''} · {m.winRate}% win rate</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>avg {m.avgPnl >= 0 ? '+' : ''}{m.avgPnl.toFixed(2)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: m.totalPnl >= 0 ? '#16a34a' : '#ef4444', minWidth: 64, textAlign: 'right' }}>{m.totalPnl >= 0 ? '+' : ''}{m.totalPnl.toFixed(2)}</div>
                    <div style={{ width: 60 }}>
                      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (m.count / Math.max(...data.byMistake.map(x => x.count))) * 100)}%`, background: '#ef4444', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.byGrade.length > 0 && (
            <div style={CARD}>
              <SectionTitle>SETUP GRADE PERFORMANCE</SectionTitle>
              <div style={{ display: 'flex', gap: 12 }}>
                {data.byGrade.map(g => (
                  <div key={g.grade} style={{ flex: 1, padding: '16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#2563eb' }}>{g.grade}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{g.count} trades</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: g.avgPnl >= 0 ? '#16a34a' : '#ef4444' }}>{g.avgPnl >= 0 ? '+' : ''}{g.avgPnl.toFixed(2)} avg</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{g.winRate}% win rate</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'symbols' && (
        <div style={CARD}>
          <SectionTitle>PERFORMANCE BY INSTRUMENT</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.bySymbol.map(s => (
              <div key={s.symbol} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto auto auto auto', gap: 10, alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.symbol}</div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.winRate}%`, background: s.pnl >= 0 ? '#16a34a' : '#ef4444', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', minWidth: 52 }}>{s.count} trades</div>
                <div style={{ fontSize: 11, color: '#64748b', minWidth: 56 }}>{s.winRate}% WR</div>
                <div style={{ fontSize: 11, color: '#64748b', minWidth: 60 }}>{s.avgPnl >= 0 ? '+' : ''}{s.avgPnl.toFixed(2)} avg</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.pnl >= 0 ? '#16a34a' : '#ef4444', minWidth: 64, textAlign: 'right' }}>{s.pnl >= 0 ? '+' : ''}{s.pnl.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
