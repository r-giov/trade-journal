import { useState, useMemo } from 'react'

const EMOTIONS = ['calm', 'focused', 'anxious', 'frustrated', 'overconfident', 'fearful', 'revenge']
const EMO_COLORS = { calm: '#16a34a', focused: '#2563eb', anxious: '#d97706', frustrated: '#ea580c', overconfident: '#db2777', fearful: '#7c3aed', revenge: '#ef4444' }

const CHECKLIST = [
  'I have reviewed the higher timeframe bias',
  'I know my max loss for today',
  'I am not trading to recover yesterday\'s losses',
  'My stop losses are defined before I enter',
  'I am not sizing up to make back money faster',
  'I am in a calm, focused headspace',
  'I have a valid setup - not just a feeling',
]

const CARD = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow)' }
const LABEL = { fontSize: 10, color: 'var(--text3)', letterSpacing: '.08em', marginBottom: 14 }

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
      padding: '5px 12px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--font-mono)',
      background: current === val ? color + '18' : 'var(--bg3)',
      border: `1px solid ${current === val ? color : 'var(--border2)'}`,
      color: current === val ? color : 'var(--text2)', cursor: 'pointer', transition: 'all .12s',
      fontWeight: current === val ? 500 : 400,
    }}>{val}</button>
  )

  return (
    <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Session journal</div>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>
          {today} - {todayTrades.length} trades today
          {todayTrades.length > 0 && <span style={{ color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500, marginLeft: 6 }}>{todayPnl >= 0 ? '+' : ''}{todayPnl.toFixed(2)}</span>}
        </div>
      </div>

      <div style={CARD}>
        <div style={LABEL}>PRE-SESSION CHECKLIST</div>
        {CHECKLIST.map((item, i) => (
          <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
              border: `1.5px solid ${checks[i] ? 'var(--accent)' : 'var(--border2)'}`,
              background: checks[i] ? 'var(--accent-bg)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {checks[i] && <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />}
            </div>
            <span style={{ fontSize: 12, color: checks[i] ? 'var(--text)' : 'var(--text2)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
        {!allChecked && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--amber-bg)', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: 'var(--amber)' }}>
            Complete all checks before trading. If you cannot tick one honestly, consider waiting.
          </div>
        )}
        {allChecked && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 6, fontSize: 12, color: 'var(--green)' }}>
            All clear. You are ready to trade.
          </div>
        )}
      </div>

      <div style={CARD}>
        <div style={LABEL}>HOW DO YOU FEEL BEFORE TRADING?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {EMOTIONS.map(e => pill(e, preEmo, setPreEmo, EMO_COLORS[e]))}
        </div>
        <textarea
          value={preNotes}
          onChange={e => setPreNotes(e.target.value)}
          placeholder="What's your mindset going into today? Any concerns?"
          style={{ fontSize: 12, width: '100%', resize: 'vertical', minHeight: 72 }}
        />
      </div>

      {todayTrades.length > 0 && (
        <div style={CARD}>
          <div style={LABEL}>POST-SESSION DEBRIEF</div>

          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>How are you feeling after the session?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {EMOTIONS.map(e => pill(e, postEmo, setPostEmo, EMO_COLORS[e]))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>Did you follow your trading plan?</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['yes', '#16a34a'], ['partially', '#d97706'], ['no', '#ef4444']].map(([v, c]) => pill(v, followedPlan, setFollowedPlan, c))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>Overall session grade</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['A', '#16a34a'], ['B', '#2563eb'], ['C', '#d97706'], ['D', '#ef4444']].map(([v, c]) => pill(v, grade, setGrade, c))}
          </div>

          <textarea
            value={postNotes}
            onChange={e => setPostNotes(e.target.value)}
            placeholder="What happened today? What did you do well? What would you change?"
            style={{ fontSize: 12, width: '100%', resize: 'vertical', minHeight: 100 }}
          />
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', padding: 12, borderRadius: 'var(--r)',
        background: 'var(--accent)', color: '#fff',
        fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer',
        opacity: saving ? 0.7 : 1,
      }}>
        {saving ? 'saving...' : saved ? 'saved' : 'save session'}
      </button>

      {sessions.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.08em', marginBottom: 12 }}>PAST SESSIONS</div>
          {sessions.slice(0, 7).map(s => (
            <div key={s.date} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', width: 90, flexShrink: 0 }}>{s.date}</span>
              {s.pre_emotion && (
                <span style={{ fontSize: 11, color: EMO_COLORS[s.pre_emotion] || 'var(--text3)', background: (EMO_COLORS[s.pre_emotion] || '#888') + '15', padding: '2px 8px', borderRadius: 100 }}>
                  {s.pre_emotion}
                </span>
              )}
              {s.post_emotion && (
                <>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>to</span>
                  <span style={{ fontSize: 11, color: EMO_COLORS[s.post_emotion] || 'var(--text3)', background: (EMO_COLORS[s.post_emotion] || '#888') + '15', padding: '2px 8px', borderRadius: 100 }}>
                    {s.post_emotion}
                  </span>
                </>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {s.followed_plan && (
                  <span style={{ fontSize: 10, color: s.followed_plan === 'yes' ? 'var(--green)' : s.followed_plan === 'no' ? 'var(--red)' : 'var(--amber)' }}>
                    plan: {s.followed_plan}
                  </span>
                )}
                {s.overall_grade && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1px 8px', borderRadius: 6 }}>{s.overall_grade}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
