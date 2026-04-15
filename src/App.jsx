import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import {
  getTrades, getJournalEntries, upsertTrades, upsertJournalEntry,
  upsertSession, getSessions, deleteTrade, deleteAllTrades,
  getImportBatches, createImportBatch, deleteImportBatch, deleteAllBatches,
} from './api'
import Auth from './Auth'
import Nav from './Nav'
import Dashboard from './Dashboard'
import Import from './Import'
import Trades from './Trades'
import Analytics from './Analytics'
import Session from './Session'
import { ToastProvider, useToast } from './Toast'
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

function AppInner() {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [trades, setTrades] = useState([])
  const [journalEntries, setJournalEntries] = useState({})
  const [sessions, setSessions] = useState([])
  const [batches, setBatches] = useState([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setTrades([]); setJournalEntries({}); setSessions([]); setBatches([])
      return
    }
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
      .catch(err => {
        console.error(err)
        toast('Failed to load data. Check your connection.', 'error')
      })
      .finally(() => setDataLoading(false))
  }, [user])

  async function handleImport(newTrades, mode, filename) {
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
    toast(`${newTrades.length} trades imported from ${filename}`, 'success')
  }

  // exposed for debugging — remove later
  window.__supabaseTest = async () => {
    const { data, error } = await supabase.from('trades').select('id').limit(1)
    console.log('Supabase test:', { data, error })
  }

  async function handleDeleteBatch(batchId) {
    const batch = batches.find(b => b.id === batchId)
    await deleteImportBatch(batchId, user.id)
    const [updated, updatedBatches] = await Promise.all([
      getTrades(user.id),
      getImportBatches(user.id),
    ])
    setTrades(updated.map(dbToTrade))
    setBatches(updatedBatches)
    toast(`Batch deleted — ${batch?.trade_count ?? ''} trades removed`, 'info')
  }

  async function handleDeleteAllBatches() {
    await deleteAllBatches(user.id)
    setTrades([])
    setJournalEntries({})
    setBatches([])
    toast('All import history cleared', 'info')
  }

  async function handleJournalUpdate(tradeId, entry) {
    setJournalEntries(prev => ({ ...prev, [tradeId]: entry }))
    await upsertJournalEntry(tradeId, user.id, entry)
  }

  async function handleDeleteTrade(id) {
    await deleteTrade(id)
    setTrades(prev => prev.filter(t => t.id !== id))
    toast('Trade deleted', 'info')
  }

  async function handleDeleteAll() {
    await deleteAllTrades(user.id)
    setTrades([])
    setJournalEntries({})
    toast('All trades deleted', 'info')
  }

  function handleBalanceSynced(currentBalance, startingBalance) {
    // Store starting balance for equity curve / drawdown calculations
    if (startingBalance > 0) {
      localStorage.setItem('tj_starting_balance', startingBalance)
    }
    toast(`MT5 balance synced: $${currentBalance.toFixed(2)}`, 'success')
  }

  async function handleSessionSave(session) {
    await upsertSession(user.id, session)
    const updated = await getSessions(user.id)
    setSessions(updated)
    toast('Session saved', 'success')
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>
      loading...
    </div>
  )

  if (!user) return <Auth />

  return (
    <BrowserRouter>
      <Nav onSignOut={() => supabase.auth.signOut()} />
      {dataLoading && (
        <div style={{ padding: '6px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: 11, color: '#2563eb', textAlign: 'center' }}>
          syncing your data...
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/import" element={<Import onImport={handleImport} batches={batches} onDeleteBatch={handleDeleteBatch} onDeleteAllBatches={handleDeleteAllBatches} onBalanceSynced={handleBalanceSynced} />} />
        <Route path="/trades" element={<Trades trades={trades} journalEntries={journalEntries} onJournalUpdate={handleJournalUpdate} onDeleteTrade={handleDeleteTrade} onDeleteAll={handleDeleteAll} />} />
        <Route path="/analytics" element={<Analytics trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/session" element={<Session sessions={sessions} trades={trades} onSave={handleSessionSave} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
