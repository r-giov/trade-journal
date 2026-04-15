import { supabase } from './supabase'

export async function getTrades(userId) {
  const { data, error } = await supabase.from('trades').select('*').eq('user_id', userId).order('open_time', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertTrades(trades, userId, batchId = null) {
  const rows = trades.map(t => ({
    id: t.id, user_id: userId,
    open_time: t.openTime, ticket: t.ticket, type: t.type, volume: t.volume,
    symbol: t.symbol, open_price: t.openPrice, close_price: t.closePrice,
    close_time: t.closeTime || null, sl: t.sl, tp: t.tp,
    profit: t.profit, outcome: t.outcome,
    ...(batchId ? { batch_id: batchId } : {}),
  }))
  const { error } = await supabase.from('trades').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteTrade(id) {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw error
}

export async function deleteAllTrades(userId) {
  const { error } = await supabase.from('trades').delete().eq('user_id', userId)
  if (error) throw error
}

// Import batches

export async function getImportBatches(userId) {
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .eq('user_id', userId)
    .order('imported_at', { ascending: false })
  if (error) {
    if (error.code === '42P01') return []
    throw error
  }
  return data
}

export async function createImportBatch(userId, filename, tradeCount) {
  const { data, error } = await supabase
    .from('import_batches')
    .insert({ user_id: userId, filename, trade_count: tradeCount })
    .select()
    .single()
  if (error) {
    if (error.code === '42P01') return null
    throw error
  }
  return data
}

export async function deleteImportBatch(batchId, userId) {
  await supabase.from('trades').delete().eq('batch_id', batchId).eq('user_id', userId)
  const { error } = await supabase.from('import_batches').delete().eq('id', batchId).eq('user_id', userId)
  if (error) throw error
}

export async function deleteAllBatches(userId) {
  await supabase.from('trades').delete().eq('user_id', userId)
  const { error } = await supabase.from('import_batches').delete().eq('user_id', userId)
  if (error) throw error
}

// Journal entries

export async function getJournalEntries(userId) {
  const { data, error } = await supabase.from('journal_entries').select('*').eq('user_id', userId)
  if (error) throw error
  const map = {}
  data.forEach(e => {
    map[e.trade_id] = {
      emotion: e.emotion,
      followedRules: e.followed_rules,
      setupGrade: e.setup_grade,
      mistakes: e.mistakes || [],
      notes: e.notes,
    }
  })
  return map
}

export async function upsertJournalEntry(tradeId, userId, entry) {
  const { error } = await supabase.from('journal_entries').upsert({
    trade_id: tradeId, user_id: userId,
    emotion: entry.emotion || null,
    followed_rules: entry.followedRules || null,
    setup_grade: entry.setupGrade || null,
    mistakes: entry.mistakes || [],
    notes: entry.notes || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'trade_id,user_id' })
  if (error) throw error
}

// Sessions

export async function getSessions(userId) {
  const { data, error } = await supabase.from('sessions').select('*').eq('user_id', userId).order('date', { ascending: false })
  if (error) throw error
  return data.map(s => ({
    date: s.date,
    preEmotion: s.pre_emotion,
    preNotes: s.pre_notes,
    postEmotion: s.post_emotion,
    postNotes: s.post_notes,
    followedPlan: s.followed_plan,
    overallGrade: s.overall_grade,
  }))
}

export async function upsertSession(userId, session) {
  const { error } = await supabase.from('sessions').upsert({
    user_id: userId, date: session.date,
    pre_emotion: session.preEmotion, pre_notes: session.preNotes,
    post_emotion: session.postEmotion, post_notes: session.postNotes,
    followed_plan: session.followedPlan, overall_grade: session.overallGrade,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' })
  if (error) throw error
}
