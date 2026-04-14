import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import { getTrades, getJournalEntries, upsertTrades, upsertJournalEntry, upsertSession, getSessions } from './api'
import Auth from './Auth'
import Nav from './Nav'
import Dashboard from './Dashboard'
import Import from './Import'
import Trades from './Trades'
import Patterns from './Patterns'
import Session from './Session'
import './index.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [trades, setTrades] = useState([])
  const [journalEntries, setJournalEntries] = useState({})
  const [sessions, setSessions] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [derivToken, setDerivToken] = useState(() => localStorage.getItem('deriv_token') || '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setTrades([]); setJournalEntries({}); setSessions([]); return }
    setDataLoading(true)
    Promise.all([getTrades(user.id), getJournalEntries(user.id), getSessions(user.id)])
      .then(([t, j, s]) => { setTrades(t.map(dbToTrade)); setJournalEntries(j); setSessions(s) })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [user])

  function dbToTrade(t) {
    return {
      id: t.id, openTime: t.open_time, ticket: t.ticket, type: t.type,
      volume: t.volume, symbol: t.symbol, openPrice: t.open_price,
      closePrice: t.close_price, sl: t.sl, tp: t.tp,
      profit: t.profit, outcome: t.outcome,
    }
  }

  async function handleImport(newTrades, mode) {
    const toSave = mode === 'replace' ? newTrades : (() => {
      const ids = new Set(trades.map(t => t.id))
      return [...trades.filter(t => ids.has(t.id)), ...newTrades.filter(t => !ids.has(t.id))]
    })()
    await upsertTrades(toSave, user.id)
    const updated = await getTrades(user.id)
    setTrades(updated.map(dbToTrade))
  }

  async function handleJournalUpdate(tradeId, entry) {
    setJournalEntries(prev => ({ ...prev, [tradeId]: entry }))
    await upsertJournalEntry(tradeId, user.id, entry)
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

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>
      loading...
    </div>
  )

  if (!user) return <Auth />

  return (
    <BrowserRouter>
      <Nav user={user} onSignOut={handleSignOut} />
      {dataLoading && (
        <div style={{ padding: '6px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: 11, color: '#2563eb', textAlign: 'center' }}>
          syncing...
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/import" element={<Import onImport={handleImport} derivToken={derivToken} onSaveDerivToken={handleSaveDerivToken} />} />
        <Route path="/trades" element={<Trades trades={trades} journalEntries={journalEntries} onJournalUpdate={handleJournalUpdate} />} />
        <Route path="/patterns" element={<Patterns trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/session" element={<Session sessions={sessions} trades={trades} onSave={handleSessionSave} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
