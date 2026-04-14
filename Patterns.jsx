import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';

const EMOTIONS = ['calm', 'focused', 'anxious', 'frustrated', 'overconfident', 'fearful', 'revenge'];
const EMO_COLOR = { calm: '#44ff88', focused: '#4488ff', anxious: '#ffaa44', frustrated: '#ff6644', overconfident: '#ff88aa', fearful: '#aa88ff', revenge: '#ff4444' };
const MISTAKES = ['sized up after loss','moved stop loss','entered without confirmation','ignored my rules','revenge traded','cut winner early','held loser too long','over-leveraged','FOMO entry','no trade plan'];

export default function Patterns({ trades, journalEntries }) {
  const data = useMemo(() => {
    const journaled = trades.filter(t => journalEntries[t.id]);
    if (!journaled.length) return null;

    const byEmotion = {};
    EMOTIONS.forEach(e => { byEmotion[e] = { wins: 0, losses: 0, totalPnl: 0, count: 0 }; });

    journaled.forEach(t => {
      const j = journalEntries[t.id];
      if (j.emotion && byEmotion[j.emotion]) {
        byEmotion[j.emotion].count++;
        byEmotion[j.emotion].totalPnl += t.profit;
        if (t.outcome === 'win') byEmotion[j.emotion].wins++;
        else if (t.outcome === 'loss') byEmotion[j.emotion].losses++;
      }
    });

    const emoChartData = Object.entries(byEmotion)
      .filter(([, v]) => v.count > 0)
      .map(([emotion, v]) => ({
        emotion,
        avgPnl: parseFloat((v.totalPnl / v.count).toFixed(2)),
        winRate: v.count ? parseFloat((v.wins / v.count * 100).toFixed(0)) : 0,
        count: v.count,
      }));

    const byMistake = {};
    MISTAKES.forEach(m => { byMistake[m] = { count: 0, totalPnl: 0 }; });
    journaled.forEach(t => {
      const j = journalEntries[t.id];
      (j.mistakes || []).forEach(m => {
        if (byMistake[m]) {
          byMistake[m].count++;
          byMistake[m].totalPnl += t.profit;
        }
      });
    });
    const mistakeData = Object.entries(byMistake)
      .filter(([, v]) => v.count > 0)
      .map(([mistake, v]) => ({ mistake, count: v.count, avgPnl: parseFloat((v.totalPnl / v.count).toFixed(2)) }))
      .sort((a, b) => a.avgPnl - b.avgPnl);

    const byRules = { yes: { count: 0, pnl: 0 }, partially: { count: 0, pnl: 0 }, no: { count: 0, pnl: 0 } };
    journaled.forEach(t => {
      const j = journalEntries[t.id];
      if (j.followedRules && byRules[j.followedRules]) {
        byRules[j.followedRules].count++;
        byRules[j.followedRules].pnl += t.profit;
      }
    });
    const rulesData = Object.entries(byRules).filter(([, v]) => v.count > 0).map(([k, v]) => ({
      label: k, count: v.count, avgPnl: parseFloat((v.pnl / v.count).toFixed(2))
    }));

    const byGrade = { A: { count: 0, pnl: 0 }, B: { count: 0, pnl: 0 }, C: { count: 0, pnl: 0 } };
    journaled.forEach(t => {
      const j = journalEntries[t.id];
      if (j.setupGrade && byGrade[j.setupGrade]) {
        byGrade[j.setupGrade].count++;
        byGrade[j.setupGrade].pnl += t.profit;
      }
    });
    const gradeData = Object.entries(byGrade).filter(([, v]) => v.count > 0).map(([k, v]) => ({
      grade: k, count: v.count, avgPnl: parseFloat((v.pnl / v.count).toFixed(2))
    }));

    const insight = [];
    if (emoChartData.length) {
      const worst = emoChartData.sort((a, b) => a.avgPnl - b.avgPnl)[0];
      const best = [...emoChartData].sort((a, b) => b.avgPnl - a.avgPnl)[0];
      if (worst.avgPnl < 0) insight.push(`Trading while ${worst.emotion} costs you ${worst.avgPnl.toFixed(2)} per trade on average.`);
      if (best.avgPnl > 0) insight.push(`You perform best when ${best.emotion} — averaging +${best.avgPnl.toFixed(2)} per trade.`);
    }
    if (rulesData.length) {
      const yes = rulesData.find(r => r.label === 'yes');
      const no = rulesData.find(r => r.label === 'no');
      if (yes && no) insight.push(`Following your rules: ${yes.avgPnl >= 0 ? '+' : ''}${yes.avgPnl.toFixed(2)} avg. Breaking them: ${no.avgPnl.toFixed(2)} avg. That's a ${(yes.avgPnl - no.avgPnl).toFixed(2)} difference per trade.`);
    }
    if (mistakeData.length) {
      const worst = mistakeData[0];
      insight.push(`Your most costly mistake: "${worst.mistake}" — ${worst.avgPnl.toFixed(2)} avg P&L when it happens.`);
    }

    return { emoChartData, mistakeData, rulesData, gradeData, insight, journaledCount: journaled.length };
  }, [trades, journalEntries]);

  if (!trades.length) return <div style={{ padding: 32, color: 'var(--text3)', textAlign: 'center' }}>No trades imported yet.</div>;
  if (!data) return <div style={{ padding: 32, color: 'var(--text3)', textAlign: 'center' }}>Journal at least one trade to see patterns.</div>;

  const tip = {
    contentStyle: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', fontFamily: 'var(--font-mono)', fontSize: 11 },
    labelStyle: { color: 'var(--text3)' },
    itemStyle: { color: 'var(--text)' },
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Patterns</div>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>Based on {data.journaledCount} journaled trades</div>
      </div>

      {data.insight.length > 0 && (
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.insight.map((ins, i) => (
            <div key={i} style={{ background: 'rgba(200,240,96,0.05)', border: '1px solid rgba(200,240,96,0.2)', borderRadius: 'var(--r)', padding: '12px 16px', fontSize: 13, color: 'var(--text)', borderLeft: '3px solid var(--accent)' }}>
              {ins}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>AVG P&L BY EMOTION</div>
          {data.emoChartData.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>No emotion data yet</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.emoChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="emotion" tick={{ fontSize: 11, fill: 'var(--text2)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...tip} formatter={(v) => [v.toFixed(2), 'avg P&L']} />
                <Bar dataKey="avgPnl" radius={[0, 3, 3, 0]}>
                  {data.emoChartData.map((entry) => (
                    <Cell key={entry.emotion} fill={entry.avgPnl >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>RULES FOLLOWED vs P&L</div>
          {data.rulesData.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>No rules data yet</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {data.rulesData.map(r => {
                const color = r.label === 'yes' ? 'var(--green)' : r.label === 'no' ? 'var(--red)' : 'var(--amber)';
                return (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color }}>{r.label}</span>
                      <span style={{ fontSize: 12, color, fontWeight: 500 }}>{r.avgPnl >= 0 ? '+' : ''}{r.avgPnl.toFixed(2)} avg · {r.count}×</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.abs(r.avgPnl) * 15 + 20)}%`, background: color, borderRadius: 3, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>COSTLY MISTAKES</div>
          {data.mistakeData.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>No mistake data yet</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.mistakeData.map(m => (
                <div key={m.mistake} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{m.mistake}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 12 }}>×{m.count}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: m.avgPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {m.avgPnl >= 0 ? '+' : ''}{m.avgPnl.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>SETUP GRADE vs P&L</div>
          {data.gradeData.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>No grade data yet</div> : (
            <div style={{ display: 'flex', gap: 12 }}>
              {data.gradeData.map(g => (
                <div key={g.grade} style={{ flex: 1, background: 'var(--bg3)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{g.grade}</div>
                  <div style={{ fontSize: 12, color: g.avgPnl >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 6, fontWeight: 500 }}>
                    {g.avgPnl >= 0 ? '+' : ''}{g.avgPnl.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>avg · {g.count}×</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
