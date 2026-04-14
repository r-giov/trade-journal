import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell, ScatterChart, Scatter } from 'recharts'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS = Array.from({length:24}, (_,i) => i)

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:700, color: color||'#0f172a', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

const tip = {
  contentStyle: { background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, fontFamily:"'DM Mono',monospace", fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' },
  labelStyle: { color:'#94a3b8' },
  itemStyle: { color:'#0f172a' },
}

export default function Analytics({ trades }) {
  const data = useMemo(() => {
    if (!trades.length) return null
    const closed = trades.filter(t => t.outcome !== 'be' || t.profit !== 0)

    // Core stats
    const total = closed.reduce((s,t) => s+t.profit, 0)
    const wins = closed.filter(t => t.outcome==='win')
    const losses = closed.filter(t => t.outcome==='loss')
    const winRate = closed.length ? wins.length/closed.length*100 : 0
    const avgWin = wins.length ? wins.reduce((s,t) => s+t.profit,0)/wins.length : 0
    const avgLoss = losses.length ? losses.reduce((s,t) => s+t.profit,0)/losses.length : 0
    const rr = avgLoss ? Math.abs(avgWin/avgLoss) : 0
    const expectancy = (winRate/100 * avgWin) + ((1-winRate/100) * avgLoss)
    const grossProfit = wins.reduce((s,t) => s+t.profit,0)
    const grossLoss = Math.abs(losses.reduce((s,t) => s+t.profit,0))
    const profitFactor = grossLoss > 0 ? grossProfit/grossLoss : grossProfit > 0 ? 999 : 0

    // Max drawdown
    let peak = 0, eq = 0, maxDD = 0
    closed.forEach(t => {
      eq += t.profit
      if (eq > peak) peak = eq
      const dd = peak - eq
      if (dd > maxDD) maxDD = dd
    })

    // Equity curve
    let running = 0
    const equity = closed.map((t,i) => { running += t.profit; return { i:i+1, pnl: parseFloat(running.toFixed(2)) } })

    // By symbol
    const symMap = {}
    closed.forEach(t => {
      if (!symMap[t.symbol]) symMap[t.symbol] = { count:0, pnl:0, wins:0 }
      symMap[t.symbol].count++
      symMap[t.symbol].pnl += t.profit
      if (t.outcome==='win') symMap[t.symbol].wins++
    })
    const bySymbol = Object.entries(symMap).map(([sym,v]) => ({ sym, count:v.count, pnl:parseFloat(v.pnl.toFixed(2)), wr:parseFloat((v.wins/v.count*100).toFixed(0)) })).sort((a,b) => b.pnl-a.pnl)

    // By day of week
    const dayMap = {}
    DAYS.forEach(d => { dayMap[d] = { count:0, pnl:0, wins:0 } })
    closed.forEach(t => {
      if (!t.openTime) return
      const parts = t.openTime.split(' ')
      if (!parts[0]) return
      const [y,m,d] = parts[0].split('.')
      if (!y||!m||!d) return
      const day = DAYS[new Date(y,m-1,d).getDay()]
      if (!dayMap[day]) return
      dayMap[day].count++
      dayMap[day].pnl += t.profit
      if (t.outcome==='win') dayMap[day].wins++
    })
    const byDay = DAYS.map(d => ({ day:d, count:dayMap[d].count, pnl:parseFloat(dayMap[d].pnl.toFixed(2)), wr:dayMap[d].count ? parseFloat((dayMap[d].wins/dayMap[d].count*100).toFixed(0)) : 0 }))

    // By hour
    const hourMap = {}
    HOURS.forEach(h => { hourMap[h] = { count:0, pnl:0, wins:0 } })
    closed.forEach(t => {
      if (!t.openTime) return
      const parts = t.openTime.split(' ')
      if (!parts[1]) return
      const hour = parseInt(parts[1].split(':')[0])
      if (isNaN(hour)) return
      hourMap[hour].count++
      hourMap[hour].pnl += t.profit
      if (t.outcome==='win') hourMap[hour].wins++
    })
    const byHour = HOURS.filter(h => hourMap[h].count > 0).map(h => ({ hour:`${h}:00`, count:hourMap[h].count, pnl:parseFloat(hourMap[h].pnl.toFixed(2)), wr:parseFloat((hourMap[h].wins/hourMap[h].count*100).toFixed(0)) }))

    // By volume/lot size
    const volMap = {}
    closed.forEach(t => {
      const v = t.volume?.toFixed(2) || '0'
      if (!volMap[v]) volMap[v] = { count:0, pnl:0, wins:0 }
      volMap[v].count++
      volMap[v].pnl += t.profit
      if (t.outcome==='win') volMap[v].wins++
    })
    const byVol = Object.entries(volMap).map(([v,d]) => ({ vol:v, count:d.count, pnl:parseFloat(d.pnl.toFixed(2)), wr:parseFloat((d.wins/d.count*100).toFixed(0)) })).sort((a,b) => parseFloat(a.vol)-parseFloat(b.vol))

    // Consecutive wins/losses
    let maxConsecWins = 0, maxConsecLosses = 0, curW = 0, curL = 0
    closed.forEach(t => {
      if (t.outcome==='win') { curW++; curL=0; maxConsecWins=Math.max(maxConsecWins,curW) }
      else if (t.outcome==='loss') { curL++; curW=0; maxConsecLosses=Math.max(maxConsecLosses,curL) }
    })

    return { total, winRate, avgWin, avgLoss, rr, expectancy, profitFactor, maxDD, equity, bySymbol, byDay, byHour, byVol, maxConsecWins, maxConsecLosses, wins:wins.length, losses:losses.length, total_trades:closed.length, grossProfit, grossLoss }
  }, [trades])

  if (!trades.length) return <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:13 }}>No trades to analyse yet. <a href="/import" style={{ color:'#2563eb' }}>Import your MT5 report →</a></div>
  if (!data) return null

  const pnlColor = data.total >= 0 ? '#16a34a' : '#ef4444'

  return (
    <div style={{ padding:'24px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:4 }}>Analytics</div>
        <div style={{ color:'#94a3b8', fontSize:12 }}>{data.total_trades} closed trades</div>
      </div>

      {/* Core stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:20 }}>
        <StatCard label="TOTAL P&L" value={`${data.total>=0?'+':''}${data.total.toFixed(2)}`} color={pnlColor} />
        <StatCard label="WIN RATE" value={`${data.winRate.toFixed(0)}%`} sub={`${data.wins}W / ${data.losses}L`} />
        <StatCard label="PROFIT FACTOR" value={data.profitFactor === 999 ? '∞' : data.profitFactor.toFixed(2)} sub="gross profit / gross loss" />
        <StatCard label="EXPECTANCY" value={`${data.expectancy>=0?'+':''}${data.expectancy.toFixed(2)}`} sub="avg $ per trade" color={data.expectancy>=0?'#16a34a':'#ef4444'} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:24 }}>
        <StatCard label="AVG WIN" value={`+${data.avgWin.toFixed(2)}`} color="#16a34a" />
        <StatCard label="AVG LOSS" value={data.avgLoss.toFixed(2)} color="#ef4444" />
        <StatCard label="RISK / REWARD" value={data.rr.toFixed(2)} sub="avg R:R ratio" />
        <StatCard label="MAX DRAWDOWN" value={`-${data.maxDD.toFixed(2)}`} color="#ef4444" sub="peak to trough" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:28 }}>
        <StatCard label="GROSS PROFIT" value={`+${data.grossProfit.toFixed(2)}`} color="#16a34a" />
        <StatCard label="GROSS LOSS" value={`-${data.grossLoss.toFixed(2)}`} color="#ef4444" />
        <StatCard label="MAX CONSEC. WINS" value={data.maxConsecWins} />
        <StatCard label="MAX CONSEC. LOSSES" value={data.maxConsecLosses} />
      </div>

      {/* Equity curve */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, marginBottom:16, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:16 }}>EQUITY CURVE</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.equity} margin={{ top:4, right:4, bottom:0, left:0 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} width={52} tickFormatter={v => v.toFixed(0)} />
            <Tooltip {...tip} formatter={v => [v.toFixed(2), 'P&L']} labelFormatter={i => `Trade ${i}`} />
            <Line type="monotone" dataKey="pnl" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* By symbol */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:16 }}>P&L BY SYMBOL</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.bySymbol} layout="vertical" margin={{ left:80, right:20 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="sym" tick={{ fontSize:10, fill:'#475569', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...tip} formatter={(v,n,p) => [v.toFixed(2), 'P&L']} />
              <Bar dataKey="pnl" radius={[0,3,3,0]}>
                {data.bySymbol.map(e => <Cell key={e.sym} fill={e.pnl>=0 ? '#16a34a' : '#ef4444'} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By day */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:16 }}>P&L BY DAY OF WEEK</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.byDay} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize:11, fill:'#475569', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...tip} formatter={(v,n) => [typeof v === 'number' ? v.toFixed(2) : v, n]} />
              <Bar dataKey="pnl" radius={[3,3,0,0]}>
                {data.byDay.map(e => <Cell key={e.day} fill={e.pnl>=0 ? '#2563eb' : '#ef4444'} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* By hour */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:16 }}>P&L BY HOUR OF DAY</div>
          {data.byHour.length === 0 ? <div style={{ color:'#94a3b8', fontSize:12 }}>No time data available</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.byHour} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize:9, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip {...tip} formatter={(v,n) => [typeof v === 'number' ? v.toFixed(2) : v, n]} />
                <Bar dataKey="pnl" radius={[3,3,0,0]}>
                  {data.byHour.map(e => <Cell key={e.hour} fill={e.pnl>=0 ? '#2563eb' : '#ef4444'} fillOpacity={0.7} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By lot size */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:16 }}>P&L BY LOT SIZE</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.byVol} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="vol" tick={{ fontSize:10, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:'#94a3b8', fontFamily:'var(--font-mono)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...tip} formatter={(v,n) => [typeof v === 'number' ? v.toFixed(2) : v, n]} />
              <Bar dataKey="pnl" radius={[3,3,0,0]}>
                {data.byVol.map(e => <Cell key={e.vol} fill={e.pnl>=0 ? '#16a34a' : '#ef4444'} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop:12 }}>
            {data.byVol.map(v => (
              <div key={v.vol} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
                <span style={{ color:'#475569' }}>lot {v.vol}</span>
                <span style={{ color:'#94a3b8' }}>{v.count}× · {v.wr}% wr</span>
                <span style={{ color: v.pnl>=0 ? '#16a34a' : '#ef4444', fontWeight:500 }}>{v.pnl>=0?'+':''}{v.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Symbol breakdown table */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:16 }}>SYMBOL BREAKDOWN</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ color:'#94a3b8', borderBottom:'1px solid #f1f5f9' }}>
              {['symbol','trades','win rate','total p&l','avg p&l'].map(h => <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontWeight:400 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.bySymbol.map(s => (
              <tr key={s.sym} style={{ borderBottom:'1px solid #f8fafc' }}>
                <td style={{ padding:'8px', fontWeight:500, color:'#0f172a' }}>{s.sym}</td>
                <td style={{ padding:'8px', color:'#475569' }}>{s.count}</td>
                <td style={{ padding:'8px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ height:4, width:60, background:'#f1f5f9', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${s.wr}%`, background: s.wr>=50 ? '#16a34a' : '#ef4444', borderRadius:2 }} />
                    </div>
                    <span style={{ color: s.wr>=50 ? '#16a34a' : '#ef4444' }}>{s.wr}%</span>
                  </div>
                </td>
                <td style={{ padding:'8px', fontWeight:500, color: s.pnl>=0 ? '#16a34a' : '#ef4444' }}>{s.pnl>=0?'+':''}{s.pnl.toFixed(2)}</td>
                <td style={{ padding:'8px', color: (s.pnl/s.count)>=0 ? '#16a34a' : '#ef4444' }}>{(s.pnl/s.count)>=0?'+':''}{(s.pnl/s.count).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
