import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setErr(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#2563eb', letterSpacing: '-0.02em', marginBottom: 4 }}>TRADELOG</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 32 }}>your personal trading journal</div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                We sent a sign-in link to<br />
                <strong style={{ color: '#0f172a' }}>{email}</strong><br />
                Click it to open the app. No password needed.
              </div>
              <button onClick={() => { setSent(false); setEmail('') }} style={{ marginTop: 20, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, color: '#94a3b8', fontSize: 11, padding: '6px 14px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 18 }}>Enter your email to sign in</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 6 }}>EMAIL</div>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  autoFocus
                />
              </div>
              {err && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', color: '#ef4444', fontSize: 12, marginBottom: 14 }}>
                  {err}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 11, borderRadius: 6,
                background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
                fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 13,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'sending...' : 'send sign-in link →'}
              </button>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
                No password. We'll email you a link each time.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
