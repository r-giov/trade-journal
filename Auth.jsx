import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setErr(''); setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErr(error.message)
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setErr(error.message)
      else setMsg('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) setErr(error.message)
      else setMsg('Password reset email sent.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#2563eb', letterSpacing: '-0.02em', marginBottom: 4 }}>TRADELOG</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 32 }}>your trading journal</div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            {[['login', 'sign in'], ['signup', 'sign up']].map(([v, l]) => (
              <button key={v} onClick={() => { setMode(v); setErr(''); setMsg('') }} style={{
                flex: 1, padding: '8px', borderRadius: 6, fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                background: mode === v ? '#eff6ff' : 'transparent',
                border: `1px solid ${mode === v ? '#2563eb' : '#e2e8f0'}`,
                color: mode === v ? '#2563eb' : '#94a3b8', cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 6 }}>EMAIL</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            {mode !== 'reset' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 6 }}>PASSWORD</div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            )}
            {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', color: '#ef4444', fontSize: 12, marginBottom: 14 }}>{err}</div>}
            {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 12px', color: '#16a34a', fontSize: 12, marginBottom: 14 }}>{msg}</div>}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 11, borderRadius: 6, background: '#2563eb', color: '#fff',
              fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'loading...' : mode === 'login' ? 'sign in →' : mode === 'signup' ? 'create account →' : 'send reset →'}
            </button>
          </form>
          {mode === 'login' && (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>forgot password?</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
