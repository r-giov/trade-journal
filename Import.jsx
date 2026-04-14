import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseMT5Report, parseCSV } from './store'
import DerivSync from './DerivSync'

export default function Import({ onImport, derivToken, onSaveDerivToken }) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('merge')
  const fileRef = useRef()
  const nav = useNavigate()

  async function processFile(file) {
    setError('')
    const text = await file.text()
    let trades = []
    if (file.name.endsWith('.html') || file.name.endsWith('.htm') || text.includes('<table') || text.includes('<TABLE')) {
      trades = parseMT5Report(text)
    } else if (file.name.endsWith('.csv') || text.includes(',')) {
      trades = parseCSV(text)
    }
    if (!trades.length) { setError('Could not parse any trades. Make sure it is an MT5 HTML report or CSV.'); return }
    setPreview({ trades, filename: file.name })
  }

  function handleDrop(e) { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }
  function handleFile(e) { const f = e.target.files[0]; if (f) processFile(f) }

  async function confirm() {
    if (!preview) return
    await onImport(preview.trades, mode)
    nav('/trades')
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Import trades</div>
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>Connect Deriv directly or upload an MT5 report</div>
      </div>

      <DerivSync onImport={onImport} savedToken={derivToken} onSaveToken={onSaveDerivToken} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>or upload a file</span>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? '#eff6ff' : '#f8fafc', transition: 'all 0.15s', marginBottom: 16,
        }}
      >
        <input ref={fileRef} type="file" accept=".html,.htm,.csv" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: 28, marginBottom: 10, color: '#94a3b8' }}>↑</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drop your MT5 report here</div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>HTML report or CSV · click to browse</div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {preview && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{preview.filename}</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{preview.trades.length} trades found</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#16a34a' }}>↑ {preview.trades.filter(t => t.type === 'buy').length} buy</span>
              <span style={{ color: '#94a3b8' }}>·</span>
              <span style={{ fontSize: 12, color: '#ef4444' }}>↓ {preview.trades.filter(t => t.type === 'sell').length} sell</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['replace', 'merge'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12,
                background: mode === m ? '#eff6ff' : 'transparent',
                border: `1px solid ${mode === m ? '#2563eb' : '#e2e8f0'}`,
                color: mode === m ? '#2563eb' : '#94a3b8', cursor: 'pointer',
              }}>{m === 'replace' ? 'replace existing' : 'merge with existing'}</button>
            ))}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                  {['time', 'symbol', 'type', 'vol', 'open', 'close', 'p&l'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.trades.slice(0, 30).map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '5px 8px', color: '#94a3b8' }}>{t.openTime?.slice(5, 16)}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 500 }}>{t.symbol}</td>
                    <td style={{ padding: '5px 8px', color: t.type === 'buy' ? '#16a34a' : '#ef4444' }}>{t.type}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{t.volume}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{t.openPrice}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{t.closePrice}</td>
                    <td style={{ padding: '5px 8px', color: t.profit >= 0 ? '#16a34a' : '#ef4444', fontWeight: 500 }}>
                      {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={confirm} style={{
            width: '100%', padding: 12, borderRadius: 6, background: '#2563eb', color: '#fff',
            fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer',
          }}>
            import {preview.trades.length} trades →
          </button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 12 }}>HOW TO EXPORT FROM MT5</div>
        {['1. Open MT5 → View → Terminal (Ctrl+T)', '2. Click the Account History tab', '3. Right-click anywhere in the history panel', '4. Select "Save as Report" → save as HTML', '5. Drop that file above'].map(s => (
          <div key={s} style={{ fontSize: 12, color: '#64748b', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>{s}</div>
        ))}
      </div>
    </div>
  )
}
