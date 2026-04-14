export function parseMT5Report(rawText) {
  let htmlText = rawText
  const bytes = new Uint8Array(rawText.length)
  for (let i = 0; i < rawText.length; i++) bytes[i] = rawText.charCodeAt(i) & 0xFF
  if ((bytes[0] === 0xFF && bytes[1] === 0xFE) || bytes[1] === 0x00) {
    htmlText = new TextDecoder('utf-16le').decode(bytes.buffer)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')
  const trades = []
  const seen = new Set()

  // Collect all deal rows (15 cols)
  const deals = []
  doc.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td')
    const vals = Array.from(cells).map(c => c.textContent.trim())
    if (cells.length === 15 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (type === 'balance') return
      deals.push({
        time: vals[0], dealId: vals[1], symbol: vals[2],
        type, direction: vals[4]?.toLowerCase(),
        volume: parseFloat(vals[5]) || 0,
        price: parseFloat(vals[6]) || 0,
        orderId: vals[7],
        profit: parseFloat(vals[12]) || parseFloat(vals[11]) || 0,
      })
    }
  })

  // Match ins with outs by position order - each in needs a matching out of same symbol
  const openStack = {} // symbol -> stack of open deals
  deals.forEach(deal => {
    const { symbol, direction, type } = deal
    if (!openStack[symbol]) openStack[symbol] = []

    if (direction === 'in') {
      openStack[symbol].push(deal)
    } else if (direction === 'out') {
      const open = openStack[symbol].shift()
      if (!open) return
      const id = `mt5-${open.orderId}-${open.time.replace(/[\s:.]/g,'')}`
      if (seen.has(id)) return
      seen.add(id)
      trades.push({
        id,
        openTime: open.time,
        ticket: open.orderId,
        type: open.type,
        volume: open.volume,
        symbol: open.symbol,
        openPrice: open.price,
        closePrice: deal.price,
        closeTime: deal.time,
        sl: '', tp: '',
        profit: deal.profit,
        outcome: deal.profit > 0.5 ? 'win' : deal.profit < -0.5 ? 'loss' : 'be',
      })
    }
  })

  // Fallback: if no deals found, try positions table (14 cols)
  if (!trades.length) {
    doc.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td')
      const vals = Array.from(cells).map(c => c.textContent.trim())
      if (cells.length === 14 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
        const type = vals[3]?.toLowerCase()
        if (!['buy','sell'].includes(type)) return
        const id = `mt5-pos-${vals[1]}`
        if (seen.has(id)) return
        seen.add(id)
        const profit = parseFloat(vals[10]) || 0
        trades.push({
          id, openTime: vals[0], ticket: vals[1], type,
          volume: parseFloat(vals[5]) || 0,
          symbol: vals[2],
          openPrice: parseFloat(vals[6]) || 0,
          closePrice: parseFloat(vals[8]) || 0,
          closeTime: '', sl: '', tp: '',
          profit,
          outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
        })
      }
    })
  }

  return trades.sort((a, b) => a.openTime.localeCompare(b.openTime))
}

export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const trades = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    if (vals.length < 5) continue
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] || '' })
    const profit = parseFloat(obj.profit || obj.pnl || obj.p_l || '0') || 0
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
    })
  }
  return trades
}
