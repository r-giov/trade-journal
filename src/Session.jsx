import { useState, useMemo } from 'react'

const EMOTIONS = ['calm', 'focused', 'anxious', 'frustrated', 'overconfident', 'fearful', 'revenge']
const EMO_COLORS = { calm: '#44ff88', focused: '#4488ff', anxious: '#ffaa44', frustrated: '#ff6644', overconfident: '#ff88aa', fearful: '#aa88ff', revenge: '#ff4444' }

const CHECKLIST = [
  'I have reviewed the higher timeframe bias',
  'I know my max loss for today',
  'I am not trading to recover yesterday\'s losses',
  'My stop losses are defined before I enter',
  'I am not sizing up to make back money faster',
  'I am in a calm, focused headspace',
  'I have a valid setup - not just a feeling',
]

export default function Session({ sessions, trades, onSave }) {
  const today = new Date().toISOString().slice(0, 10)
  const existing = sessions.find(s => s.date === today) || {}

  const [preEmo, setPreEmo] = useState(existing.pre_emotion || '')
  const [preNotes, setPreNotes] = useState(existing.pre_notes || '')
  const [postEmo, setPostEmo] = useState(existing.post_emotion || '')
  const [postNotes, setPostNotes] = useState(existing.post_notes || '')
  const [followedPlan, setFollowedPlan] = useState(existing.followed_plan || '')
  const [grade, setGrade] = useState(existing.overall_grade || '')
  const [checks, setChecks] = useState({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const todayTrades = useMemo(() => trades.filter(t => t.openTime?.slice(0, 10) === today), [trades, today])
  const todayPnl = todayTrades.reduce((s, t) => s + t.profit, 0)
  const allChecked = CHECKLIST.every((_, i) => checks[i])

  function toggleCheck(i) { setChecks(p => ({ ...p, [i]: !p[i] })) }

  async function handleSave() {
    setSaving(true)
    await onSave({ date: today, preEmotion: preEmo, preNotes, postEmotion: postEmo, postNotes, followedPlan, overallGrade: grade })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const pill = (val, current, setter, color) => (
    <button key={val} onClick={() => setter(val)} style={{
      padding: '5px 12px', borderRadius: 100, fontSize: 11, fontFamily: "'DM Mono',monospace",
      background: current === val ? `rgba(${color},0.1)` : '#1a1a1a',
      border: `1px solid ${current === val ? `rgb(${color})` : '#2a2a2a'}`,
      color: current === val ? `rgb(${color})` : '#555', cursor: 'pointer', transition: 'all .12s',
    }}>{val}</button>
  )

  return (
    <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Session journal</div>
        <div style={{ color: '#555', fontSize: 12 }}>{today} · {todayTrades.length} trades today · <span style={{ color: todayPnl >= 0 ? '#44ff88' : '#ff4455', fontWeight: 500 }}>{todayPnl >= 0 ? '+' : ''}{todayPnl.toFixed(2)}</span></div>
      </div>

      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: '.08em', marginBottom: 16 }}>PRE-SESSION CHECKLIST</div>
        {CHECKLIST.map((item, i) => (
          <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${checks[i] ? '#44ff88' : '#333'}`, background: checks[i] ? 'rgba(68,255,136,.15)' : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {checks[i] && <div style={{ width: 8, height: 8, borderRadius: 2, background: '#44ff88' }} />}
            </div>
            <span style={{ fontSize: 12, color: checks[i] ? '#f0ede8' : '#555', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
        {!allChecked && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,170,68,.05)', border: '1px solid rgba(255,170,68,.2)', borderRadius: 6, fontSize: 12, color: '#ffaa44' }}>
            Complete all checks before trading. If you can't tick one honestly, consider waiting.
          </div>
        )}
        {allChecked && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(68,255,136,.05)', border: '1px solid rgba(68,255,136,.2)', borderRadius: 6, fontSize: 12, color: '#44ff88' }}>
            All clear. You are ready to trade.
          </div>
        )}
      </div>

      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: '.08em', marginBottom: 14 }}>HOW DO YOU FEEL BEFORE TRADING?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {EMOTIONS.map(e => {
            const c = EMO_COLORS[e] || '#888'
            const rgb = c.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(',')
            return pill(e, preEmo, setPreEmo, rgb)
          })}
        </div>
        <textarea value={preNotes} onChange={e => setPreNotes(e.target.value)}
          placeholder="What's your mindset going into today? Any concerns?"
          style={{ fontFamily: "'DM Mono',monospace", background: '#1a1a1a', color: '#f0ede8', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontSize: 12, width: '100%', outline: 'none', resize: 'vertical', minHeight: 72, boxSizing: 'border-box' }} />
      </div>

      {todayTrades.length > 0 && (
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '.08em', marginBottom: 14 }}>POST-SESSION DEBRIEF</div>

          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>How are you feeling after the session?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {EMOTIONS.map(e => {
              const c = EMO_COLORS[e] || '#888'
              const rgb = c.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(',')
              return pill(e, postEmo, setPostEmo, rgb)
            })}
          </div>

          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Did you follow your trading plan?</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['yes', '68,255,136'], ['partially', '255,170,68'], ['no', '255,68,85']].map(([v, rgb]) => pill(v, followedPlan, setFollowedPlan, rgb))}
          </div>

          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Overall session grade</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['A', '200,240,96'], ['B', '200,240,96'], ['C', '255,170,68'], ['D', '255,68,85']].map(([v, rgb]) => pill(v, grade, setGrade, rgb))}
          </div>

          <textarea value={postNotes} onChange={e => setPostNotes(e.target.value)}
            placeholder="What happened today? What did you do well? What would you change?"
            style={{ fontFamily: "'DM Mono',monospace", background: '#1a1a1a', color: '#f0ede8', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontSize: 12, width: '100%', outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }} />
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', padding: 12, borderRadius: 6, background: '#c8f060', color: '#0a0a0a',
        fontFamily: "'DM Mono',monospace", fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer',
      }}>
        {saving ? 'saving...' : saved ? '✓ saved' : 'save session →'}
      </button>

      {sessions.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '.08em', marginBottom: 12 }}>PAST SESSIONS</div>
          {sessions.slice(0, 7).map(s => (
            <div key={s.date} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ fontSize: 11, color: '#444', width: 90 }}>{s.date}</span>
              {s.pre_emotion && <span style={{ fontSize: 11, color: EMO_COLORS[s.pre_emotion] || '#555' }}>{s.pre_emotion}</span>}
              <span style={{ fontSize: 10, color: '#333' }}>→</span>
              {s.post_emotion && <span style={{ fontSize: 11, color: EMO_COLORS[s.post_emotion] || '#555' }}>{s.post_emotion}</span>}
              {s.overall_grade && <span style={{ fontSize: 11, color: '#c8f060', marginLeft: 'auto' }}>{s.overall_grade}</span>}
              {s.followed_plan && <span style={{ fontSize: 10, color: s.followed_plan === 'yes' ? '#44ff88' : s.followed_plan === 'no' ? '#ff4455' : '#ffaa44' }}>plan: {s.followed_plan}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
