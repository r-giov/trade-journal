import { useState } from 'react'

const EMOTIONS = ['calm','focused','anxious','frustrated','overconfident','fearful','revenge']
const EMO_COLORS = { calm:'#16a34a', focused:'#2563eb', anxious:'#d97706', frustrated:'#ea580c', overconfident:'#db2777', fearful:'#7c3aed', revenge:'#ef4444' }
const MISTAKES = ['sized up after loss','moved stop loss','entered without confirmation','ignored my rules','revenge traded','cut winner early','held loser too long','over-leveraged','FOMO entry','no trade plan']

function Pill({ label, active, color, onClick }) {
  const c = color || '#64748b'
  return (
    <button onClick={onClick} style={{ padding:'4px 11px', borderRadius:100, fontSize:11, fontFamily:'var(--font-mono)', background: active ? `${c}18` : '#f8fafc', border:`1px solid ${active ? c : '#e2e8f0'}`, color: active ? c : '#94a3b8', cursor:'pointer', transition:'all .12s', whiteSpace:'nowrap' }}>{label}</button>
  )
}

function JournalPanel({ trade, entry, onChange, onClose }) {
  const e = entry || {}
  const up = (k, v) => onChange(trade.id, { ...e, [k]: v })
  const toggleMistake = m => { const cur = e.mistakes||[]; up('mistakes', cur.includes(m) ? cur.filter(x=>x!==m) : [...cur,m]) }

  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderTop:'none', borderRadius:'0 0 10px 10px', padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, color:'#0f172a' }}>
          {trade.symbol} <span style={{ color: trade.type==='buy' ? '#16a34a' : '#ef4444' }}>{trade.type}</span> @ {trade.openPrice}
          <span style={{ marginLeft:12, color: trade.profit>=0 ? '#16a34a' : '#ef4444', fontWeight:600 }}>{trade.profit>=0?'+':''}{trade.profit.toFixed(2)}</span>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:6, color:'#94a3b8', fontSize:12, padding:'3px 10px', cursor:'pointer', fontFamily:'var(--font-mono)' }}>close</button>
      </div>

      <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:8 }}>HOW WERE YOU FEELING?</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:16 }}>
        {EMOTIONS.map(em => <Pill key={em} label={em} active={e.emotion===em} color={EMO_COLORS[em]} onClick={() => up('emotion', em)} />)}
      </div>

      <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:8 }}>MISTAKES MADE</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:16 }}>
        {MISTAKES.map(m => <Pill key={m} label={m} active={(e.mistakes||[]).includes(m)} color='#ef4444' onClick={() => toggleMistake(m)} />)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:8 }}>FOLLOWED RULES?</div>
          <div style={{ display:'flex', gap:5 }}>
            {[['yes','#16a34a'],['partially','#d97706'],['no','#ef4444']].map(([v,c]) => <Pill key={v} label={v} active={e.followedRules===v} color={c} onClick={() => up('followedRules', v)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:8 }}>SETUP GRADE</div>
          <div style={{ display:'flex', gap:5 }}>
            {['A','B','C'].map(v => <Pill key={v} label={v} active={e.setupGrade===v} color='#2563eb' onClick={() => up('setupGrade', v)} />)}
          </div>
        </div>
      </div>

      <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.08em', marginBottom:6 }}>NOTES</div>
      <textarea value={e.notes||''} onChange={ev => up('notes', ev.target.value)} placeholder="What happened? What would you do differently?" style={{ fontSize:12 }} />
      <div style={{ fontSize:10, color: Object.keys(e).length > 0 ? '#16a34a' : '#94a3b8', marginTop:6 }}>
        {Object.keys(e).length > 0 ? '✓ saved' : 'tap anything to start journaling'}
      </div>
    </div>
  )
}

export default function Trades({ trades, journalEntries, onJournalUpdate, onDeleteTrade, onDeleteAll }) {
  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const filtered = trades.filter(t => {
    if (filter === 'win' && t.outcome !== 'win') return false
    if (filter === 'loss' && t.outcome !== 'loss') return false
    if (filter === 'unjournaled' && journalEntries[t.id]) return false
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).slice().reverse()

  const journaled = trades.filter(t => journalEntries[t.id]).length

  if (!trades.length) return (
    <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
      No trades yet. <a href="/import" style={{ color:'#2563eb' }}>Import your MT5 report</a>
    </div>
  )

  return (
    <div style={{ padding:'24px', maxWidth:960, margin:'0 auto' }}>
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <input type="text" placeholder="search symbol..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:160, fontSize:12 }} />
        <div style={{ display:'flex', gap:4 }}>
          {[['all','all'],['win','wins'],['loss','losses'],['unjournaled','needs journal']].map(([v,label]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', background: filter===v ? '#eff6ff' : 'transparent', border:`1px solid ${filter===v ? '#2563eb' : '#e2e8f0'}`, color: filter===v ? '#2563eb' : '#94a3b8', cursor:'pointer' }}>{label}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#94a3b8' }}>{filtered.length} trades · {journaled}/{trades.length} journaled</span>
          {confirmDeleteAll ? (
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#ef4444' }}>delete all {trades.length} trades?</span>
              <button onClick={() => { onDeleteAll(); setConfirmDeleteAll(false) }} style={{ padding:'4px 10px', borderRadius:5, background:'#ef4444', color:'#fff', fontSize:11, fontFamily:'var(--font-mono)', border:'none', cursor:'pointer' }}>yes, delete all</button>
              <button onClick={() => setConfirmDeleteAll(false)} style={{ padding:'4px 10px', borderRadius:5, background:'transparent', color:'#94a3b8', fontSize:11, fontFamily:'var(--font-mono)', border:'1px solid #e2e8f0', cursor:'pointer' }}>cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDeleteAll(true)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', background:'transparent', border:'1px solid #fecaca', color:'#ef4444', cursor:'pointer' }}>delete all</button>
          )}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {filtered.map(t => {
          const j = journalEntries[t.id]
          const isOpen = open === t.id
          const isConfirmDelete = confirmDeleteId === t.id
          return (
            <div key={t.id}>
              <div onClick={() => !isConfirmDelete && setOpen(isOpen ? null : t.id)} style={{ display:'grid', gridTemplateColumns:'100px 36px 140px 50px 80px 80px 72px 1fr 32px', gap:6, alignItems:'center', padding:'10px 14px', borderRadius: isOpen ? '10px 10px 0 0' : 10, background: isOpen ? '#eff6ff' : '#fff', border:`1px solid ${isOpen ? '#bfdbfe' : '#e2e8f0'}`, cursor:'pointer', transition:'background .1s', boxShadow:'0 1px 2px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize:11, color:'#94a3b8' }}>{t.openTime?.slice(5,16)}</span>
                <span style={{ fontSize:11, color: t.type==='buy' ? '#16a34a' : '#ef4444', fontWeight:500 }}>{t.type==='buy' ? '↑' : '↓'}</span>
                <span style={{ fontSize:13, fontWeight:500, color:'#0f172a' }}>{t.symbol}</span>
                <span style={{ fontSize:11, color:'#94a3b8' }}>×{t.volume}</span>
                <span style={{ fontSize:11, color:'#94a3b8' }}>{t.openPrice}</span>
                <span style={{ fontSize:11, color:'#94a3b8' }}>{t.closePrice}</span>
                <span style={{ fontSize:13, fontWeight:600, color: t.profit>=0 ? '#16a34a' : '#ef4444' }}>{t.profit>=0?'+':''}{t.profit.toFixed(2)}</span>
                <div style={{ display:'flex', gap:5, alignItems:'center', justifyContent:'flex-start' }}>
                  {j?.emotion && <span style={{ fontSize:10, color: EMO_COLORS[j.emotion]||'#94a3b8', background:`${EMO_COLORS[j.emotion]}15`, padding:'1px 7px', borderRadius:100 }}>{j.emotion}</span>}
                  {j?.followedRules && <span style={{ fontSize:10, color: j.followedRules==='yes' ? '#16a34a' : j.followedRules==='no' ? '#ef4444' : '#d97706' }}>rules:{j.followedRules}</span>}
                  {j?.setupGrade && <span style={{ fontSize:10, color:'#2563eb', fontWeight:500 }}>{j.setupGrade}</span>}
                  {!j && <span style={{ fontSize:10, color:'#94a3b8' }}>+ journal</span>}
                </div>
                <div onClick={e => { e.stopPropagation(); setConfirmDeleteId(isConfirmDelete ? null : t.id) }} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4, color:'#cbd5e1', fontSize:14, cursor:'pointer', transition:'color .1s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}>×</div>
              </div>
              {isConfirmDelete && (
                <div style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderTop:'none', borderRadius:'0 0 10px 10px' }}>
                  <span style={{ fontSize:12, color:'#ef4444', flex:1 }}>Delete this trade?</span>
                  <button onClick={() => { onDeleteTrade(t.id); setConfirmDeleteId(null) }} style={{ padding:'4px 12px', borderRadius:5, background:'#ef4444', color:'#fff', fontSize:11, fontFamily:'var(--font-mono)', border:'none', cursor:'pointer' }}>delete</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ padding:'4px 12px', borderRadius:5, background:'transparent', color:'#94a3b8', fontSize:11, fontFamily:'var(--font-mono)', border:'1px solid #e2e8f0', cursor:'pointer' }}>cancel</button>
                </div>
              )}
              {isOpen && <JournalPanel trade={t} entry={journalEntries[t.id]} onChange={onJournalUpdate} onClose={() => setOpen(null)} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
