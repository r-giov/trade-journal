function cleanNum(str) {
  if (!str) return 0
  return parseFloat(str.replace(/\s/g, '')) || 0
}

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

  // Collect all deal rows (15 cols) for history reports
  const deals = []
  doc.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td')
    const vals = Array.from(cells).map(c => c.textContent.trim())
    if (cells.length === 15 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (type === 'balance') return
      deals.push({
        time: vals[0], symbol: vals[2], type,
        direction: vals[4]?.toLowerCase(),
        volume: cleanNum(vals[5]),
        price: cleanNum(vals[6]),
        orderId: vals[7],
        profit: cleanNum(vals[12]) || cleanNum(vals[11]),
      })
    }
    if (cells.length === 14 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (!['buy','sell'].includes(type)) return
      const id = `mt5-pos-${vals[1]}`
      if (seen.has(id)) return
      seen.add(id)
      const profit = cleanNum(vals[10])
      trades.push({
        id, openTime: vals[0], ticket: vals[1], type,
        volume: cleanNum(vals[5]), symbol: vals[2],
        openPrice: cleanNum(vals[6]), closePrice: cleanNum(vals[8]),
        closeTime: '', sl: '', tp: '',
        profit, outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
      })
    }
  })

  if (deals.length) {
    const openStack = {}
    deals.forEach(deal => {
      if (!openStack[deal.symbol]) openStack[deal.symbol] = []
      if (deal.direction === 'in') {
        openStack[deal.symbol].push(deal)
      } else if (deal.direction === 'out') {
        const open = openStack[deal.symbol].shift()
        if (!open) return
        const id = `mt5-${open.orderId}-${open.time.replace(/[\s:.]/g,'')}`
        if (seen.has(id)) return
        seen.add(id)
        trades.push({
          id, openTime: open.time, ticket: open.orderId,
          type: open.type, volume: open.volume, symbol: open.symbol,
          openPrice: open.price, closePrice: deal.price,
          closeTime: deal.time, sl: '', tp: '',
          profit: deal.profit,
          outcome: deal.profit > 0.5 ? 'win' : deal.profit < -0.5 ? 'loss' : 'be',
        })
      }
    })
  }

  return trades.sort((a, b) => a.openTime.localeCompare(b.openTime))
}

export function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)

  // Find the Positions header row specifically
  let headerIdx = -1
  let endIdx = lines.length
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase()
    // Look for header with Time,Position,Symbol,Type,Volume,Price...Profit
    if (l.startsWith('time,position') || l.startsWith('"time","position"')) {
      headerIdx = i
    }
    // Stop at Orders or Deals section
    if (headerIdx !== -1 && i > headerIdx && (l.startsWith('open time,order') || l.startsWith('time,deal'))) {
      endIdx = i
      break
    }
  }

  // Fallback: find any header with time+symbol+type+profit
  if (headerIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toLowerCase()
      if (l.includes('time') && l.includes('symbol') && l.includes('type') && l.includes('profit')) {
        headerIdx = i
        break
      }
    }
  }

  if (headerIdx === -1) return []

  const trades = []
  const seen = new Set()

  for (let i = headerIdx + 1; i < endIdx; i++) {
    const line = lines[i]
    if (!line || !(/^\d{4}/.test(line))) continue
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
    if (vals.length < 9) continue
    const type = vals[3]?.toLowerCase()
    if (!['buy', 'sell'].includes(type)) continue

    // Skip rows that look like balance/summary (no close time)
    const closeTime = vals[8] || ''
    if (!closeTime || !/^\d{4}/.test(closeTime)) continue

    const profit = cleanNum(vals[12])
    const id = `csv-${vals[1]}-${vals[0].replace(/[\s:.]/g,'')}`
    if (seen.has(id)) continue
    seen.add(id)

    trades.push({
      id,
      openTime: vals[0],
      ticket: vals[1],
      type,
      volume: cleanNum(vals[4]),
      symbol: vals[2],
      openPrice: cleanNum(vals[5]),
      sl: vals[6] || '',
      tp: vals[7] || '',
      closeTime,
      closePrice: cleanNum(vals[9]),
      profit,
      outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
    })
  }

  return trades.sort((a, b) => a.openTime.localeCompare(b.openTime))
}
