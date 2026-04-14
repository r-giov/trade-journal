import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './Nav';
import Dashboard from './Dashboard';
import Import from './Import';
import Trades from './Trades';
import Patterns from './Patterns';
import { loadData, saveData } from './store';
import './index.css';

export default function App() {
  const [data, setData] = useState(() => loadData());

  useEffect(() => { saveData(data); }, [data]);

  function handleImport(newTrades, mode) {
    setData(prev => {
      if (mode === 'replace') return { ...prev, trades: newTrades };
      const existingIds = new Set(prev.trades.map(t => t.id));
      const merged = [...prev.trades, ...newTrades.filter(t => !existingIds.has(t.id))];
      return { ...prev, trades: merged };
    });
  }

  function handleJournalUpdate(tradeId, entry) {
    setData(prev => ({
      ...prev,
      journalEntries: { ...prev.journalEntries, [tradeId]: entry }
    }));
  }

  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard trades={data.trades} journalEntries={data.journalEntries} />} />
        <Route path="/import" element={<Import onImport={handleImport} />} />
        <Route path="/trades" element={<Trades trades={data.trades} journalEntries={data.journalEntries} onJournalUpdate={handleJournalUpdate} />} />
        <Route path="/patterns" element={<Patterns trades={data.trades} journalEntries={data.journalEntries} />} />
      </Routes>
    </BrowserRouter>
  );
}
