import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts'

const CARD = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }
const TIP = { contentStyle:{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'var(--font-mono)', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }, labelStyle:{ color:'#94a3b8' } }

export default function Analytics({ trades }) {
  const data = useMemo(() => {
    if (!trades.length) return null
    const closed = trades.filter(t => t.outcome !== 'be' || t.closePrice)
    const wins = closed.filter(t => t.outcome === 'win')
    const losses = closed.filter(t => t.outcome === 'loss')
    const total = closed.reduce((s, t) => s + t.profit, 0)
    const winRate = closed.length ? wins.length / closed.length * 100 : 0
    const avgWin = wins.length ? wins.reduce((s,t) => s+t.profit,0)/wins.length : 0
    const avgLoss = losses.length ? losses.reduce((s,t) => s+t.profit,0)/losses.length : 0
    const rr = avgLoss ? Math.abs(avgWin/avgLoss) : 0
    const expectancy = (winRate/100*avgWin) + ((1-winRate/100)*avgLoss)

    let peak=0, running=0, maxDD=0
    const equity = closed.map((t,i) => {
      running += t.profit
      if (running > peak) peak = running
      const dd = peak > 0 ? ((peak-running)/peak)*100 : 0
      if (dd > maxDD) maxDD = dd
      return { i:i+1, pnl:parseFloat(running.toFixed(2)), dd:parseFloat(dd.toFixed(2)) }
    })

    const symMap = {}
    closed.forEach(t => {
      if (!symMap[t.symbol]) symMap[t.symbol] = { wins:0, losses:0, pnl:0, count:0 }
      symMap[t.symbol].count++; symMap[t.symbol].pnl += t.profit
      if (t.outcome==='win') symMap[t.symbol].wins++
      else if (t.outcome==='loss') symMap[t.symbol].losses++
    })
    const bySymbol = Object.entries(symMap).map(([sym,v]) => ({ symbol:sym, count:v.count, pnl:parseFloat(v.pnl.toFixed(2)), winRate:parseFloat((v.wins/v.count*100).toFixed(0)), avgPnl:parseFloat((v.pnl/v.count).toFixed(2)) })).sort((a,b)=>b.pnl-a.pnl)

    const hourMap = {}
    closed.forEach(t => {
      const h = t.openTime?.slice(11,13); if(!h) return
      if (!hourMap[h]) hourMap[h] = { wins:0,losses:0,pnl:0,count:0 }
      hourMap[h].count++; hourMap[h].pnl += t.profit
      if (t.outcome==='win') hourMap[h].wins++; else if(t.outcome==='loss') hourMap[h].losses++
    })
    const byHour = Object.entries(hourMap).sort(([a],[b])=>a.localeCompare(b)).map(([h,v]) => ({ hour:h+':00', count:v.count, pnl:parseFloat(v.pnl.toFixed(2)), winRate:parseFloat((v.wins/v.count*100).toFixed(0)) }))

    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const dayMap = {}
    closed.forEach(t => {
      if (!t.openTime) return
      const p=t.openTime.slice(0,10).split('.')
      if(p.length<3) return
      const d=new Date(`${p[0]}-${p[1]}-${p[2]}`).getDay()
      const day=days[d]
      if(!dayMap[day]) dayMap[day]={wins:0,losses:0,pnl:0,count:0}
      dayMap[day].count++; dayMap[day].pnl+=t.profit
      if(t.outcome==='win') dayMap[day].wins++; else if(t.outcome==='loss') dayMap[day].losses++
    })
    const byDay = days.filter(d=>dayMap[d]).map(d=>({ day:d, count:dayMap[d].count, pnl:parseFloat(dayMap[d].pnl.toFixed(2)), winRate:parseFloat((dayMap[d].wins/dayMap[d].count*100).toFixed(0)) }))

    const volMap = {}
    closed.forEach(t => {
      const v=String(t.volume); if(!volMap[v]) volMap[v]={wins:0,losses:0,pnl:0,count:0}
      volMap[v].count++; volMap[v].pnl+=t.profit
      if(t.outcome==='win') volMap[v].wins++; else if(t.outcome==='loss') volMap[v].losses++
    })
    const byVolume = Object.entries(volMap).sort(([a],[b])=>parseFloat(a)-parseFloat(b)).map(([v,d])=>({ volume:v, count:d.count, pnl:parseFloat(d.pnl.toFixed(2)), winRate:parseFloat((d.wins/d.count*100).toFixed(0)) }))

    let curStreak=0, maxWinStreak=0, maxLossStreak=0, curType=null
    closed.forEach(t => {
      if(t.outcome==='win'){if(curType==='win')curStreak++;else{curStreak=1;curType='win'};if(curStreak>maxWinStreak)maxWinStreak=curStreak}
      else if(t.outcome==='loss'){if(curType==='loss')curStreak++;else{curStreak=1;curType='loss'};if(curStreak>maxLossStreak)maxLossStreak=curStreak}
    })

    const pie=[{name:'Wins',value:wins.length,color:'#16a34a'},{name:'Losses',value:losses.length,color:'#ef4444'},{name:'Break even',value:closed.filter(t=>t.outcome==='be').length,color:'#94a3b8'}].filter(p=>p.value>0)

    return { closed, wins, losses, total, winRate, avgWin, avgLoss, rr, expectancy, maxDD, equity, bySymbol, byHour, byDay, byVolume, pie, maxWinStreak, maxLossStreak }
  }, [trades])

  if (!trades.length || !data) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:12,textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)',fontSize:36,fontWeight:800,color:'#e2e8f0' }}>NO DATA</div>
      <div style={{ color:'#94a3b8',fontSize:13 }}>Import your trades to see analytics</div>
    </div>
  )

  const stats = [
    { label:'TOTAL P&L', value:`${data.total>=0?'+':''}${data.total.toFixed(2)}`, color:data.total>=0?'#16a34a':'#ef4444' },
    { label:'WIN RATE', value:`${data.winRate.toFixed(0)}%`, sub:`${data.wins.length}W / ${data.losses.length}L` },
    { label:'EXPECTANCY', value:`${data.expectancy>=0?'+':''}${data.expectancy.toFixed(2)}`, sub:'per trade', color:data.expectancy>=0?'#16a34a':'#ef4444' },
    { label:'AVG WIN', value:`+${data.avgWin.toFixed(2)}`, color:'#16a34a' },
    { label:'AVG LOSS', value:`${data.avgLoss.toFixed(2)}`, color:'#ef4444' },
    { label:'RISK:REWARD', value:data.rr.toFixed(2) },
    { label:'MAX DRAWDOWN', value:`${data.maxDD.toFixed(1)}%`, color:data.maxDD>20?'#ef4444':data.maxDD>10?'#d97706':'#16a34a' },
    { label:'STREAK', value:`${data.maxWinStreak}W`, sub:`worst: ${data.maxLossStreak}L` },
  ]

  return (
    <div style={{ padding:'24px', maxWidth:1200, margin:'0 auto' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, marginBottom:4 }}>Analytics</div>
      <div style={{ color:'#94a3b8', fontSize:12, marginBottom:24 }}>{data.closed.length} closed trades</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)',fontSize:24,fontWeight:700,color:s.color||'#0f172a',lineHeight:1 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        <div style={CARD}>
          <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>EQUITY CURVE</div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={data.equity} margin={{ top:4,right:4,bottom:0,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9,fill:'#94a3b8',fontFamily:'monospace' }} axisLine={false} tickLine={false} width={48} tickFormatter={v=>v.toFixed(0)} />
              <Tooltip {...TIP} formatter={(v)=>[v.toFixed(2),'P&L']} labelFormatter={i=>`Trade ${i}`} />
              <Line type="monotone" dataKey="pnl" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={CARD}>
          <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>WIN / LOSS SPLIT</div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={data.pie} cx="50%" cy="45%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                {data.pie.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip {...TIP} />
              <Legend iconSize={8} iconType="circle" formatter={v=><span style={{ fontSize:11,color:'#64748b' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={CARD}>
          <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>P&L BY HOUR</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.byHour} margin={{ top:4,right:4,bottom:0,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize:9,fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9,fill:'#94a3b8',fontFamily:'monospace' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...TIP} formatter={v=>[v.toFixed(2),'P&L']} />
              <Bar dataKey="pnl" radius={[3,3,0,0]}>{data.byHour.map((e,i)=><Cell key={i} fill={e.pnl>=0?'#16a34a':'#ef4444'} fillOpacity={0.8}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={CARD}>
          <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>P&L BY DAY OF WEEK</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.byDay} margin={{ top:4,right:4,bottom:0,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9,fill:'#94a3b8',fontFamily:'monospace' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...TIP} formatter={v=>[v.toFixed(2),'P&L']} />
              <Bar dataKey="pnl" radius={[3,3,0,0]}>{data.byDay.map((e,i)=><Cell key={i} fill={e.pnl>=0?'#2563eb':'#ef4444'} fillOpacity={0.8}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={CARD}>
          <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>PERFORMANCE BY SYMBOL</div>
          <div style={{ display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto' }}>
            {data.bySymbol.map(s=>(
              <div key={s.symbol} style={{ display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:8,alignItems:'center',padding:'8px 10px',background:'#f8fafc',borderRadius:6,border:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:12,fontWeight:500 }}>{s.symbol}</div>
                <div style={{ fontSize:11,color:'#94a3b8' }}>{s.count}×</div>
                <div style={{ fontSize:11,color:'#64748b' }}>{s.winRate}% WR</div>
                <div style={{ fontSize:13,fontWeight:500,color:s.pnl>=0?'#16a34a':'#ef4444',minWidth:56,textAlign:'right' }}>{s.pnl>=0?'+':''}{s.pnl.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={CARD}>
          <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>P&L BY LOT SIZE</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.byVolume} margin={{ top:4,right:4,bottom:0,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="volume" tick={{ fontSize:10,fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9,fill:'#94a3b8',fontFamily:'monospace' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...TIP} formatter={v=>[v.toFixed(2),'P&L']} />
              <Bar dataKey="pnl" radius={[3,3,0,0]}>{data.byVolume.map((e,i)=><Cell key={i} fill={e.pnl>=0?'#2563eb':'#ef4444'} fillOpacity={0.8}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginTop:10 }}>
            {data.byVolume.map(v=>(
              <div key={v.volume} style={{ padding:'3px 9px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:100,fontSize:10,color:'#64748b' }}>
                {v.volume} · {v.winRate}% WR · {v.count}×
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={CARD}>
        <div style={{ fontSize:10,color:'#94a3b8',letterSpacing:'.08em',marginBottom:14 }}>DRAWDOWN OVER TIME</div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={data.equity} margin={{ top:4,right:4,bottom:0,left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:9,fill:'#94a3b8',fontFamily:'monospace' }} axisLine={false} tickLine={false} width={40} tickFormatter={v=>`${v.toFixed(0)}%`} reversed />
            <Tooltip {...TIP} formatter={v=>[`${v.toFixed(2)}%`,'Drawdown']} labelFormatter={i=>`Trade ${i}`} />
            <Line type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
