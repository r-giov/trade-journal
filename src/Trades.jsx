import { useState } from 'react'

const EMOTIONS = [
  { label:'calm',         color:'#16a34a' },
  { label:'focused',      color:'#2563eb' },
  { label:'confident',    color:'#0891b2' },
  { label:'motivated',    color:'#7c3aed' },
  { label:'patient',      color:'#059669' },
  { label:'anxious',      color:'#d97706' },
  { label:'frustrated',   color:'#ea580c' },
  { label:'overconfident',color:'#db2777' },
  { label:'fearful',      color:'#9333ea' },
  { label:'revenge',      color:'#ef4444' },
  { label:'impulsive',    color:'#dc2626' },
  { label:'distracted',   color:'#78716c' },
]
const EMO_COLORS = Object.fromEntries(EMOTIONS.map(e => [e.label, e.color]))
const MISTAKES = ['sized up after loss','moved stop loss','entered without confirmation','ignored my rules','revenge traded','cut winner early','held loser too long','over-leveraged','FOMO entry','no trade plan']
const POSITIVES = ['followed my plan','waited for confirmation','respected stop loss','sized correctly','patient entry','took profit at target','stayed disciplined','good risk management','trusted the setup','cut loss early']

function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'4px 11px', borderRadius:100, fontSize:11, fontFamily:'var(--font-mono)',
      background: active ? `${color}18` : '#f8fafc',
      border: `1px solid ${active ? color : '#e2e8f0'}`,
      color: active ? color : '#94a3b8', cursor:'pointer', transition:'all .12s',
    }}>{label}</button>
  )
}

function JournalPanel({ trade, entry, onChange, onClose }) {
  const e = entry || {}
  const set = (k, v) => onChange(trade.id, { ...e, [k]: v })
  const toggleMistake = m => { const cur = e.mistakes||[]; set('mistakes', cur.includes(m) ? cur.filter(x=>x!==m) : [...cur,m]) }
  const togglePositive = p => { const cur = e.positives||[]; set('positives', cur.includes(p) ? cur.filter(x=>x!==p) : [...cur,p]) }

  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderTop:'none', borderRadius:'0 0 10px 10px', padding:18, marginBottom:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:500 }}>{trade.symbol} {trade.type} @ {trade.openPrice} <span style={{ color:trade.profit>=0?'#16a34a':'#ef4444' }}>{trade.profit>=0?'+':''}{trade.profit.toFixed(2)}</span></span>
        <button onClick={onClose} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:5, color:'#94a3b8', padding:'3px 10px', fontSize:11, cursor:'pointer' }}>close</button>
      </div>
      <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.07em', marginBottom:7 }}>HOW WERE YOU FEELING?</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
        {EMOTIONS.map(em => <Pill key={em.label} label={em.label} active={e.emotion===em.label} color={em.color} onClick={()=>set('emotion',em.label)} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:10, color:'#16a34a', letterSpacing:'.07em', marginBottom:7 }}>WHAT YOU DID RIGHT</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {POSITIVES.map(p => <Pill key={p} label={p} active={(e.positives||[]).includes(p)} color="#16a34a" onClick={()=>togglePositive(p)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#ef4444', letterSpacing:'.07em', marginBottom:7 }}>MISTAKES</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {MISTAKES.map(m => <Pill key={m} label={m} active={(e.mistakes||[]).includes(m)} color="#ef4444" onClick={()=>toggleMistake(m)} />)}
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.07em', marginBottom:7 }}>FOLLOWED RULES?</div>
          <div style={{ display:'flex', gap:5 }}>
            {['yes','partially','no'].map(v => <Pill key={v} label={v} active={e.followedRules===v} color={v==='yes'?'#16a34a':v==='no'?'#ef4444':'#d97706'} onClick={()=>set('followedRules',v)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:'.07em', marginBottom:7 }}>SETUP GRADE</div>
          <div style={{ display:'flex', gap:5 }}>
            {['A','B','C'].map(v => <Pill key={v} label={v} active={e.setupGrade===v} color="#2563eb" onClick={()=>set('setupGrade',v)} />)}
          </div>
        </div>
      </div>
      <textarea value={e.notes||''} onChange={ev=>set('notes',ev.target.value)} placeholder="What happened? What would you do differently?" style={{ fontSize:12, lineHeight:1.6 }} />
      {Object.keys(e).length > 0 && <div style={{ fontSize:10, color:'#16a34a', marginTop:6 }}>✓ saved</div>}
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
    if (filter==='win' && t.outcome!=='win') return false
    if (filter==='loss' && t.outcome!=='loss') return false
    if (filter==='unjournaled' && journalEntries[t.id]) return false
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).slice().reverse()

  if (!trades.length) return (
    <div style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>
      No trades yet. <a href="/import" style={{ color:'#2563eb' }}>Import your first report</a>
    </div>
  )

  return (
    <div style={{ padding:'24px', maxWidth:960, margin:'0 auto' }}>
      <div style={{ display:'flex', gap:8, marginBottom:18, alignItems:'center', flexWrap:'wrap' }}>
        <input type="text" placeholder="search symbol..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:150, fontSize:12 }} />
        <div style={{ display:'flex', gap:4 }}>
          {[['all','all'],['win','wins'],['loss','losses'],['unjournaled','needs journal']].map(([v,l]) => (
            <button key={v} onClick={()=>setFilter(v)} style={{ padding:'6px 12px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', background:filter===v?'#eff6ff':'transparent', border:`1px solid ${filter===v?'#2563eb':'#e2e8f0'}`, color:filter===v?'#2563eb':'#94a3b8', cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:12, color:'#94a3b8' }}>{filtered.length} trades · {trades.filter(t=>journalEntries[t.id]).length}/{trades.length} journaled</span>
        <button onClick={()=>setConfirmDeleteAll(true)} style={{ padding:'6px 12px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', cursor:'pointer' }}>delete all</button>
      </div>

      {confirmDeleteAll && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'#ef4444', flex:1 }}>Delete all {trades.length} trades? This cannot be undone.</span>
          <button onClick={()=>{ onDeleteAll(); setConfirmDeleteAll(false) }} style={{ padding:'6px 14px', borderRadius:6, fontSize:12, background:'#ef4444', color:'#fff', border:'none', cursor:'pointer', fontFamily:'var(--font-mono)' }}>yes, delete all</button>
          <button onClick={()=>setConfirmDeleteAll(false)} style={{ padding:'6px 14px', borderRadius:6, fontSize:12, background:'transparent', color:'#64748b', border:'1px solid #e2e8f0', cursor:'pointer', fontFamily:'var(--font-mono)' }}>cancel</button>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {filtered.map(t => {
          const j = journalEntries[t.id]
          const isOpen = open === t.id
          const isConfirmDelete = confirmDeleteId === t.id
          return (
            <div key={t.id}>
              <div onClick={()=>setOpen(isOpen?null:t.id)} style={{
                display:'grid', gridTemplateColumns:'90px 38px 130px 48px 76px 76px 68px 1fr 32px',
                gap:6, alignItems:'center', padding:'10px 14px',
                borderRadius: isOpen ? '10px 10px 0 0' : 10,
                background: isOpen ? '#f0f7ff' : '#fff',
                border: `1px solid ${isOpen?'#bfdbfe':'#e2e8f0'}`,
                cursor:'pointer', transition:'all .1s', boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize:10, color:'#94a3b8' }}>{t.openTime?.slice(5,16)}</div>
                <div style={{ fontSize:11, color:t.type==='buy'?'#16a34a':'#ef4444' }}>{t.type==='buy'?'↑':'↓'}</div>
                <div style={{ fontSize:13, fontWeight:500 }}>{t.symbol}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>×{t.volume}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{t.openPrice}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{t.closePrice}</div>
                <div style={{ fontSize:13, fontWeight:500, color:t.profit>=0?'#16a34a':'#ef4444' }}>{t.profit>=0?'+':''}{t.profit.toFixed(2)}</div>
                <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                  {j?.emotion && <span style={{ fontSize:10, color:EMO_COLORS[j.emotion]||'#94a3b8', padding:'1px 6px', borderRadius:100, background:'#f1f5f9' }}>{j.emotion}</span>}
                  {j?.followedRules && <span style={{ fontSize:10, color:j.followedRules==='yes'?'#16a34a':j.followedRules==='no'?'#ef4444':'#d97706' }}>rules:{j.followedRules}</span>}
                  {j?.setupGrade && <span style={{ fontSize:10, color:'#2563eb' }}>{j.setupGrade}</span>}
                  {!j && <span style={{ fontSize:10, color:'#94a3b8' }}>+ journal</span>}
                </div>
                <button onClick={e=>{ e.stopPropagation(); setConfirmDeleteId(t.id) }} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:4, color:'#94a3b8', padding:'2px 6px', fontSize:11, cursor:'pointer' }}>×</button>
              </div>
              {isConfirmDelete && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderTop:'none', borderRadius:'0 0 8px 8px', padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, color:'#ef4444', flex:1 }}>Delete this trade?</span>
                  <button onClick={()=>{ onDeleteTrade(t.id); setConfirmDeleteId(null) }} style={{ padding:'5px 12px', borderRadius:5, fontSize:11, background:'#ef4444', color:'#fff', border:'none', cursor:'pointer', fontFamily:'var(--font-mono)' }}>delete</button>
                  <button onClick={()=>setConfirmDeleteId(null)} style={{ padding:'5px 12px', borderRadius:5, fontSize:11, background:'transparent', color:'#64748b', border:'1px solid #e2e8f0', cursor:'pointer', fontFamily:'var(--font-mono)' }}>cancel</button>
                </div>
              )}
              {isOpen && <JournalPanel trade={t} entry={journalEntries[t.id]} onChange={onJournalUpdate} onClose={()=>setOpen(null)} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
