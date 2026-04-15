import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Nav from './Nav'
import Dashboard from './Dashboard'
import Import from './Import'
import Trades from './Trades'
import Analytics from './Analytics'
import Session from './Session'
import * as store from './storage'
import './index.css'

export default function App() {
  const [trades, setTrades] = useState(() => store.getTrades())
  const [journalEntries, setJournalEntries] = useState(() => store.getJournalEntries())
  const [sessions, setSessions] = useState(() => store.getSessions())
  const [batches, setBatches] = useState(() => store.getImportBatches())

  function handleImport(newTrades, mode, filename) {
    const batch = store.createImportBatch(filename, newTrades.length)
    store.upsertTrades(newTrades, batch.id, mode)
    setTrades(store.getTrades())
    setBatches(store.getImportBatches())
  }

  function handleDeleteBatch(batchId) {
    store.deleteImportBatch(batchId)
    setTrades(store.getTrades())
    setBatches(store.getImportBatches())
  }

  function handleJournalUpdate(tradeId, entry) {
    store.upsertJournalEntry(tradeId, entry)
    setJournalEntries(store.getJournalEntries())
  }

  function handleDeleteTrade(id) {
    store.deleteTrade(id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  function handleDeleteAll() {
    store.deleteAllTrades()
    setTrades([])
    setJournalEntries({})
    setBatches([])
  }

  function handleSessionSave(session) {
    store.upsertSession(session)
    setSessions(store.getSessions())
  }

  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/import" element={<Import onImport={handleImport} batches={batches} onDeleteBatch={handleDeleteBatch} />} />
        <Route path="/trades" element={<Trades trades={trades} journalEntries={journalEntries} onJournalUpdate={handleJournalUpdate} onDeleteTrade={handleDeleteTrade} onDeleteAll={handleDeleteAll} />} />
        <Route path="/analytics" element={<Analytics trades={trades} journalEntries={journalEntries} sessions={sessions} />} />
        <Route path="/session" element={<Session sessions={sessions} trades={trades} onSave={handleSessionSave} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
