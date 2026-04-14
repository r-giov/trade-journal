const STORAGE_KEY = 'tradelog_v1';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { trades: [], journalEntries: {} };
    return JSON.parse(raw);
  } catch {
    return { trades: [], journalEntries: {} };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function parseMT5Report(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const rows = doc.querySelectorAll('tr');
  const trades = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 9) return;
    const timeText = cells[0]?.textContent?.trim();
    if (!timeText || !/^\d{4}/.test(timeText)) return;
    const type = cells[2]?.textContent?.trim().toLowerCase();
    if (!['buy', 'sell'].includes(type)) return;

    const profitText = cells[cells.length - 2]?.textContent?.trim().replace(/\s/g, '') || '0';
    const profit = parseFloat(profitText) || 0;

    trades.push({
      id: `${timeText}-${cells[1]?.textContent?.trim()}`,
      openTime: timeText,
      ticket: cells[1]?.textContent?.trim(),
      type,
      volume: parseFloat(cells[3]?.textContent?.trim()) || 0,
      symbol: cells[4]?.textContent?.trim(),
      openPrice: parseFloat(cells[5]?.textContent?.trim()) || 0,
      sl: cells[6]?.textContent?.trim(),
      tp: cells[7]?.textContent?.trim(),
      closeTime: cells[8]?.textContent?.trim(),
      closePrice: parseFloat(cells[9]?.textContent?.trim()) || 0,
      profit,
      outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
    });
  });

  return trades;
}

export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const trades = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (vals.length < 5) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });

    const profit = parseFloat(obj.profit || obj.pnl || obj.p_l || '0') || 0;
    trades.push({
      id: `csv-${i}-${Date.now()}`,
      openTime: obj.open_time || obj.time || obj.date || '',
      ticket: obj.ticket || obj.order || `${i}`,
      type: (obj.type || obj.direction || 'buy').toLowerCase(),
      volume: parseFloat(obj.volume || obj.size || obj.lots || '0') || 0,
      symbol: obj.symbol || obj.instrument || obj.pair || '',
      openPrice: parseFloat(obj.open_price || obj.price || obj.entry || '0') || 0,
      sl: obj.s_l || obj.sl || obj.stop_loss || '',
      tp: obj.t_p || obj.tp || obj.take_profit || '',
      closeTime: obj.close_time || '',
      closePrice: parseFloat(obj.close_price || obj.exit || '0') || 0,
      profit,
      outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
    });
  }
  return trades;
}
