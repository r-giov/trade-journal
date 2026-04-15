import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseMT5Report, parseCSV } from './store'

export default function Import({ onImport, batches = [], onDeleteBatch }) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('merge')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
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

    if (!trades.length) {
      setError('Could not parse any trades. Make sure this is an MT5 HTML report or CSV export.')
      return
    }
    setPreview({ trades, filename: file.name })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  async function confirm() {
    if (!preview) return
    await onImport(preview.trades, mode, preview.filename)
    nav('/trades')
  }

  async function handleDeleteBatch(batchId) {
    setDeleting(true)
    try {
      await onDeleteBatch(batchId)
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Import trades</div>
        <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.8 }}>
          Export from Deriv MT5: View → Terminal → Account History → right-click → Save as Report (HTML).
          Or export as Excel and convert using the script in Scripts/mt5_to_csv.py.
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 'var(--r2)', padding: '48px 24px', textAlign: 'center',
          cursor: 'pointer', background: dragging ? '#eff6ff' : 'var(--bg2)',
          transition: 'all 0.15s', marginBottom: 20,
        }}
      >
        <input ref={fileRef} type="file" accept=".html,.htm,.csv" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: 28, marginBottom: 12, color: 'var(--text3)' }}>+</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drop your MT5 report here</div>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>HTML report or CSV — click to browse</div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 'var(--r)', padding: '12px 16px', color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {preview && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{preview.filename}</div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>{preview.trades.length} trades found</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--green)' }}>+{preview.trades.filter(t => t.type === 'buy').length} buy</span>
              <span style={{ color: 'var(--text3)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--red)' }}>-{preview.trades.filter(t => t.type === 'sell').length} sell</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['replace', 'replace all existing'], ['merge', 'merge with existing']].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '6px 14px', borderRadius: 'var(--r)', fontSize: 12,
                background: mode === m ? 'var(--accent-bg)' : 'transparent',
                border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border2)'}`,
                color: mode === m ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
                  {['time', 'symbol', 'type', 'vol', 'open', 'close', 'p&l'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.trades.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--text3)' }}>{t.openTime?.slice(5, 16)}</td>
                    <td style={{ padding: '4px 8px' }}>{t.symbol}</td>
                    <td style={{ padding: '4px 8px', color: t.type === 'buy' ? 'var(--green)' : 'var(--red)' }}>{t.type}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--text2)' }}>{t.volume}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--text2)' }}>{t.openPrice}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--text2)' }}>{t.closePrice}</td>
                    <td style={{ padding: '4px 8px', color: t.profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                      {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={confirm} style={{
            width: '100%', padding: 12, borderRadius: 'var(--r)',
            background: 'var(--accent)', color: '#fff',
            fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer',
          }}>
            import {preview.trades.length} trades
          </button>
        </div>
      )}

      {/* Import history / batches */}
      {batches.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.08em', marginBottom: 14 }}>IMPORT HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {batches.map(b => (
              <div key={b.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{b.filename || 'Import'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {b.trade_count} trades · {new Date(b.imported_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(b.id)}
                    style={{ padding: '4px 12px', borderRadius: 'var(--r)', fontSize: 11, background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                  >
                    delete batch
                  </button>
                </div>
                {confirmDelete === b.id && (
                  <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--red)', flex: 1 }}>Delete all {b.trade_count} trades from this import?</span>
                    <button onClick={() => handleDeleteBatch(b.id)} disabled={deleting} style={{ padding: '5px 12px', borderRadius: 'var(--r)', fontSize: 11, background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                      {deleting ? '...' : 'yes, delete'}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} style={{ padding: '5px 12px', borderRadius: 'var(--r)', fontSize: 11, background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border2)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to export guide */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 12 }}>HOW TO EXPORT FROM DERIV MT5</div>
        {[
          '1. Open MT5 and log into your Deriv account',
          '2. Click View in the top menu → Terminal (Ctrl+T)',
          '3. Click the Account History tab',
          '4. Right-click anywhere in the history panel',
          '5. Select "Save as Report" and save as HTML',
          '6. Drop that file above',
        ].map(s => (
          <div key={s} style={{ fontSize: 12, color: 'var(--text2)', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>{s}</div>
        ))}
      </div>
    </div>
  )
}
