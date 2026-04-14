import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import {
  getTrades, getJournalEntries, upsertTrades, upsertJournalEntry,
  upsertSession, getSessions, deleteTrade, deleteAllTrades,
  getImportBatches, createImportBatch, deleteImportBatch,
} from './api'
import Auth from './Auth'
import Nav from './Nav'
import Dashboard from './Dashboard'
import Import from './Import'
import Trades from './Trades'
import Analytics from './Analytics'
import Session from './Session'
import './index.css'

function dbToTrade(t) {
  return {
    id: t.id, openTime: t.open_time, ticket: t.ticket, type: t.type,
    volume: t.volume, symbol: t.symbol, openPrice: t.open_price,
    closePrice: t.close_price, closeTime: t.close_time || '',
    sl: t.sl, tp: t.tp, profit: t.profit, outcome: t.outcome,
    batchId: t.batch_id || null,
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [trades, setTrades] = useState([])
  const [journalEntries, setJournalEntries] = useState({})
  const [sessions, setSessions] = useState([])
  const [batches, setBatches] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [derivToken, setDerivToken] = useState(() => localStorage.getItem('deriv_token') || '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setTrades([]); setJournalEntries({}); setSessions([]); setBatches([]); return }
    setDataLoading(true)
    Promise.all([
      getTrades(user.id),
      getJournalEntries(user.id),
      getSessions(user.id),
      getImportBatches(user.id),
    ])
      .then(([t, j, s, b]) => {
        setTrades(t.map(dbToTrade))
        setJournalEntries(j)
        setSessions(s)
        setBatches(b)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [user])

  async function handleImport(newTrades, mode, filename) {
    // Create a batch record
    const batch = await createImportBatch(user.id, filename, newTrades.length)
    const batchId = batch?.id || null

    const toSave = mode === 'replace' ? newTrades : (() => {
      const ids = new Set(trades.map(t => t.id))
      return [...trades, ...newTrades.filter(t => !ids.has(t.id))]
    })()

    await upsertTrades(toSave, user.id, batchId)

    const [updated, updatedBatches] = await Promise.all([
      getTrades(user.id),
      getImportBatches(user.id),
    ])
    setTrades(updated.map(dbToTrade))
    setBatches(updatedBatches)
  }

  async function handleDeleteBatch(batchId) {
    await deleteImportBatch(batchId, user.id)
    const [updated, updatedBatches] = await Promise.all([
      getTrades(user.id),
      getImportBatches(user.id),
    ])
    setTrades(updated.map(dbToTrade))
    setBatches(updatedBatches)
  }

  async function handleJournalUpdate(tradeId, entry) {
    setJournalEntries(prev => ({ ...prev, [tradeId]: entry }))
    await upsertJournalEntry(tradeId, user.id, entry)
  }

  async function handleDeleteTrade(id) {
    await deleteTrade(id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  async function handleDeleteAll() {
    await deleteAllTrades(user.id)
    setTrades([])
    setJournalEntries({})
  }

  async function handleSessionSave(session) {
    await upsertSession(user.id, session)
    const updated = await getSessions(user.id)
    setSessions(updated)
  }

  function handleSaveDerivToken(token) {
    localStorage.setItem('deriv_token', token)
    setDerivToken(token)
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text3)', fontFamily: 'monospace', fontSize: 13 }}>
      loading...
    </div>
  )
  if (!user) return <Auth />

  return (
    <BrowserRouter>
      <Nav user={user} onSignOut={() => supabase.auth.signOut()} />
      {dataLoading && (
        <div style={{ padding: '6px 24px', background: 'var(--accent-bg)', borderBottom: '1px solid var(--accent-border)', fontSize: 11, color: 'var(--accent)', textAlign: 'center' }}>
          syncing...
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/import" element={<Import onImport={handleImport} batches={batches} onDeleteBatch={handleDeleteBatch} derivToken={derivToken} onSaveDerivToken={handleSaveDerivToken} />} />
        <Route path="/trades" element={<Trades trades={trades} journalEntries={journalEntries} onJournalUpdate={handleJournalUpdate} onDeleteTrade={handleDeleteTrade} onDeleteAll={handleDeleteAll} />} />
        <Route path="/analytics" element={<Analytics trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/session" element={<Session sessions={sessions} trades={trades} onSave={handleSessionSave} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
