import { useState } from 'react';

const EMOTIONS = ['calm', 'focused', 'anxious', 'frustrated', 'overconfident', 'fearful', 'revenge'];
const MISTAKES = [
  'sized up after loss',
  'moved stop loss',
  'entered without confirmation',
  'ignored my rules',
  'revenge traded',
  'cut winner early',
  'held loser too long',
  'over-leveraged',
  'FOMO entry',
  'no trade plan',
];
const EMO_COLOR = { calm: '#44ff88', focused: '#4488ff', anxious: '#ffaa44', frustrated: '#ff6644', overconfident: '#ff88aa', fearful: '#aa88ff', revenge: '#ff4444' };

function JournalPanel({ trade, entry, onChange, onClose }) {
  const e = entry || {};

  function update(key, val) {
    onChange(trade.id, { ...e, [key]: val });
  }

  function toggleMistake(m) {
    const cur = e.mistakes || [];
    const next = cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m];
    update('mistakes', next);
  }

  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--r2)', padding: 20, marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>
          {trade.symbol} {trade.type} @ {trade.openPrice}
          <span style={{ marginLeft: 12, color: trade.profit >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 16 }}>
            {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', color: 'var(--text3)', fontSize: 18, padding: '2px 6px' }}>×</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 8 }}>HOW WERE YOU FEELING?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EMOTIONS.map(em => (
            <button
              key={em}
              onClick={() => update('emotion', em)}
              style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--font-mono)',
                background: e.emotion === em ? 'rgba(200,240,96,0.1)' : 'var(--bg3)',
                border: `1px solid ${e.emotion === em ? EMO_COLOR[em] || 'var(--accent)' : 'var(--border)'}`,
                color: e.emotion === em ? EMO_COLOR[em] || 'var(--accent)' : 'var(--text3)',
                transition: 'all 0.12s',
              }}
            >{em}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 8 }}>MISTAKES MADE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {MISTAKES.map(m => {
            const active = (e.mistakes || []).includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleMistake(m)}
                style={{
                  padding: '5px 12px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--font-mono)',
                  background: active ? 'var(--red-bg)' : 'var(--bg3)',
                  border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
                  color: active ? 'var(--red)' : 'var(--text3)',
                  transition: 'all 0.12s',
                }}
              >{m}</button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 6 }}>DID I FOLLOW MY RULES?</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['yes', 'partially', 'no'].map(v => (
              <button
                key={v}
                onClick={() => update('followedRules', v)}
                style={{
                  flex: 1, padding: '6px', borderRadius: 'var(--r)', fontSize: 11, fontFamily: 'var(--font-mono)',
                  background: e.followedRules === v ? (v === 'yes' ? 'rgba(68,255,136,0.1)' : v === 'no' ? 'var(--red-bg)' : 'rgba(255,170,68,0.1)') : 'var(--bg3)',
                  border: `1px solid ${e.followedRules === v ? (v === 'yes' ? 'var(--green)' : v === 'no' ? 'var(--red)' : 'var(--amber)') : 'var(--border)'}`,
                  color: e.followedRules === v ? (v === 'yes' ? 'var(--green)' : v === 'no' ? 'var(--red)' : 'var(--amber)') : 'var(--text3)',
                }}
              >{v}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 6 }}>SETUP QUALITY</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['A', 'B', 'C'].map(v => (
              <button
                key={v}
                onClick={() => update('setupGrade', v)}
                style={{
                  flex: 1, padding: '6px', borderRadius: 'var(--r)', fontSize: 11, fontFamily: 'var(--font-mono)',
                  background: e.setupGrade === v ? 'rgba(200,240,96,0.1)' : 'var(--bg3)',
                  border: `1px solid ${e.setupGrade === v ? 'var(--accent)' : 'var(--border)'}`,
                  color: e.setupGrade === v ? 'var(--accent)' : 'var(--text3)',
                }}
              >{v}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 6 }}>WHAT HAPPENED / NOTES</div>
        <textarea
          value={e.notes || ''}
          onChange={ev => update('notes', ev.target.value)}
          placeholder="What were you thinking? What would you do differently?"
          style={{ fontSize: 12, lineHeight: 1.6 }}
        />
      </div>

      <div style={{ fontSize: 11, color: 'var(--green)' }}>
        {Object.keys(e).length > 0 ? '✓ saved automatically' : ''}
      </div>
    </div>
  );
}

export default function Trades({ trades, journalEntries, onJournalUpdate }) {
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = trades.filter(t => {
    if (filter === 'win' && t.outcome !== 'win') return false;
    if (filter === 'loss' && t.outcome !== 'loss') return false;
    if (filter === 'unjournaled' && journalEntries[t.id]) return false;
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).reverse();

  if (!trades.length) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
      No trades yet. <a href="/import" style={{ color: 'var(--accent)' }}>Import your MT5 report</a>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="search symbol..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 160, fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all', 'all'], ['win', 'wins'], ['loss', 'losses'], ['unjournaled', 'needs journal']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--r)', fontSize: 11, fontFamily: 'var(--font-mono)',
                background: filter === v ? 'rgba(200,240,96,0.1)' : 'transparent',
                border: `1px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`,
                color: filter === v ? 'var(--accent)' : 'var(--text3)',
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} trades · {trades.filter(t => journalEntries[t.id]).length}/{trades.length} journaled
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(t => {
          const j = journalEntries[t.id];
          const isOpen = open === t.id;
          return (
            <div key={t.id}>
              <div
                onClick={() => setOpen(isOpen ? null : t.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 40px 130px 50px 80px 80px 70px 1fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: isOpen ? 'var(--r) var(--r) 0 0' : 'var(--r)',
                  background: isOpen ? 'var(--bg3)' : 'var(--bg2)',
                  border: `1px solid ${isOpen ? 'var(--border2)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.openTime?.slice(5, 16)}</div>
                <div style={{ fontSize: 11, color: t.type === 'buy' ? 'var(--green)' : 'var(--red)' }}>{t.type}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{t.symbol}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>×{t.volume}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.openPrice}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.closePrice}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {j?.emotion && <span style={{ fontSize: 10, color: EMO_COLOR[j.emotion] || 'var(--text3)' }}>{j.emotion}</span>}
                  {j?.followedRules && <span style={{ fontSize: 10, color: j.followedRules === 'yes' ? 'var(--green)' : j.followedRules === 'no' ? 'var(--red)' : 'var(--amber)' }}>rules: {j.followedRules}</span>}
                  {j?.setupGrade && <span style={{ fontSize: 10, color: 'var(--accent)' }}>{j.setupGrade}</span>}
                  {!j && <span style={{ fontSize: 10, color: 'var(--text3)' }}>+ journal</span>}
                </div>
              </div>
              {isOpen && (
                <JournalPanel
                  trade={t}
                  entry={journalEntries[t.id]}
                  onChange={onJournalUpdate}
                  onClose={() => setOpen(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
