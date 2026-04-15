// localStorage-based data layer — no backend required

const KEYS = {
  trades:  'tj_trades',
  journal: 'tj_journal',
  sessions:'tj_sessions',
  batches: 'tj_batches',
}

function get(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function set(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Trades ────────────────────────────────────────────────────────────────

export function getTrades() {
  return get(KEYS.trades) || []
}

export function upsertTrades(newTrades, batchId, mode) {
  const tagged = newTrades.map(t => ({ ...t, batchId: batchId || null }))
  if (mode === 'replace') {
    set(KEYS.trades, tagged)
    return
  }
  const existing = getTrades()
  const ids = new Set(existing.map(t => t.id))
  const merged = [...existing, ...tagged.filter(t => !ids.has(t.id))]
  set(KEYS.trades, merged.sort((a, b) => a.openTime.localeCompare(b.openTime)))
}

export function deleteTrade(id) {
  set(KEYS.trades, getTrades().filter(t => t.id !== id))
}

export function deleteAllTrades() {
  set(KEYS.trades, [])
  set(KEYS.journal, {})
  set(KEYS.batches, [])
}

// ── Journal entries ───────────────────────────────────────────────────────

export function getJournalEntries() {
  return get(KEYS.journal) || {}
}

export function upsertJournalEntry(tradeId, entry) {
  const entries = getJournalEntries()
  entries[tradeId] = entry
  set(KEYS.journal, entries)
}

// ── Sessions ──────────────────────────────────────────────────────────────

export function getSessions() {
  return (get(KEYS.sessions) || []).sort((a, b) => b.date.localeCompare(a.date))
}

export function upsertSession(session) {
  const sessions = get(KEYS.sessions) || []
  const idx = sessions.findIndex(s => s.date === session.date)
  if (idx >= 0) sessions[idx] = session
  else sessions.push(session)
  set(KEYS.sessions, sessions)
}

// ── Import batches ────────────────────────────────────────────────────────

export function getImportBatches() {
  return (get(KEYS.batches) || []).sort((a, b) => b.imported_at.localeCompare(a.imported_at))
}

export function createImportBatch(filename, tradeCount) {
  const batch = {
    id: crypto.randomUUID(),
    filename,
    trade_count: tradeCount,
    imported_at: new Date().toISOString(),
  }
  const batches = get(KEYS.batches) || []
  batches.push(batch)
  set(KEYS.batches, batches)
  return batch
}

export function deleteImportBatch(batchId) {
  set(KEYS.batches, (get(KEYS.batches) || []).filter(b => b.id !== batchId))
  set(KEYS.trades, getTrades().filter(t => t.batchId !== batchId))
}
