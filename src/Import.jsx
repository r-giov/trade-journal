import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseMT5Report, parseCSV } from './store';

export default function Import({ onImport }) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('replace');
  const fileRef = useRef();
  const nav = useNavigate();

  async function processFile(file) {
    setError('');
    const text = await file.text();
    let trades = [];

    if (file.name.endsWith('.html') || file.name.endsWith('.htm') || text.includes('<table') || text.includes('<TABLE')) {
      trades = parseMT5Report(text);
    } else if (file.name.endsWith('.csv') || text.includes(',')) {
      trades = parseCSV(text);
    }

    if (!trades.length) {
      setError('Could not parse any trades from this file. Make sure it is an MT5 HTML report or CSV export.');
      return;
    }
    setPreview({ trades, filename: file.name });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  }

  function confirm() {
    if (!preview) return;
    onImport(preview.trades, mode);
    nav('/trades');
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Import trades</div>
        <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.8 }}>
          Export your trade history from Deriv MT5: open MT5 → View → Account History → right-click → Save as Report (HTML).
          Then drop the file here.
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 'var(--r2)',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(200,240,96,0.04)' : 'var(--bg2)',
          transition: 'all 0.15s',
          marginBottom: 20,
        }}
      >
        <input ref={fileRef} type="file" accept=".html,.htm,.csv" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--text3)' }}>⬆</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          Drop your MT5 report here
        </div>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>HTML report or CSV · click to browse</div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid #3a1a1a', borderRadius: 'var(--r)', padding: '12px 16px', color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
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
              <span style={{ fontSize: 12, color: 'var(--green)' }}>↑ {preview.trades.filter(t => t.type === 'buy').length} buy</span>
              <span style={{ color: 'var(--text3)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--red)' }}>↓ {preview.trades.filter(t => t.type === 'sell').length} sell</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['replace', 'merge'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 16px', borderRadius: 'var(--r)', fontSize: 12,
                  background: mode === m ? 'rgba(200,240,96,0.12)' : 'transparent',
                  border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border2)'}`,
                  color: mode === m ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {m === 'replace' ? 'replace existing' : 'merge with existing'}
              </button>
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
                {preview.trades.slice(0, 30).map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--text3)' }}>{t.openTime?.slice(5, 16)}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--text)' }}>{t.symbol}</td>
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

          <button
            onClick={confirm}
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--r)',
              background: 'var(--accent)', color: '#0a0a0a',
              fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13,
            }}
          >
            import {preview.trades.length} trades →
          </button>
        </div>
      )}

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 12 }}>HOW TO EXPORT FROM DERIV MT5</div>
        {[
          '1. Open MT5 and log into your Deriv account',
          '2. Click View in the top menu → Terminal (Ctrl+T)',
          '3. Click the Account History tab',
          '4. Right-click anywhere in the history panel',
          '5. Select "Save as Report" → save as HTML',
          '6. Drop that file above',
        ].map(s => (
          <div key={s} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{s}</div>
        ))}
      </div>
    </div>
  );
}
