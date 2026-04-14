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
  const deals = []

  doc.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td')
    const vals = Array.from(cells).map(c => c.textContent.trim())
    if (cells.length === 15 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (type === 'balance') return
      deals.push({ time: vals[0], symbol: vals[2], type, direction: vals[4]?.toLowerCase(), volume: cleanNum(vals[5]), price: cleanNum(vals[6]), orderId: vals[7], profit: cleanNum(vals[12]) || cleanNum(vals[11]) })
    }
    if (cells.length === 14 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (!['buy','sell'].includes(type)) return
      const id = `mt5-pos-${vals[1]}`
      if (seen.has(id)) return
      seen.add(id)
      const profit = cleanNum(vals[10])
      trades.push({ id, openTime: vals[0], ticket: vals[1], type, volume: cleanNum(vals[5]), symbol: vals[2], openPrice: cleanNum(vals[6]), closePrice: cleanNum(vals[8]), closeTime: '', sl: '', tp: '', profit, outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be' })
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
        trades.push({ id, openTime: open.time, ticket: open.orderId, type: open.type, volume: open.volume, symbol: open.symbol, openPrice: open.price, closePrice: deal.price, closeTime: deal.time, sl: '', tp: '', profit: deal.profit, outcome: deal.profit > 0.5 ? 'win' : deal.profit < -0.5 ? 'loss' : 'be' })
      }
    })
  }
  return trades.sort((a, b) => a.openTime.localeCompare(b.openTime))
}

export function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  let headerIdx = -1, endIdx = lines.length

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase()
    if ((l.startsWith('time,position') || l.startsWith('"time","position"') || l.startsWith('time,ticket') || l.startsWith('open time')) && l.includes('symbol') && l.includes('type')) {
      headerIdx = i
    }
    if (headerIdx !== -1 && i > headerIdx && (l.startsWith('open time,order') || l.startsWith('time,deal') || l.startsWith('time,order'))) {
      endIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toLowerCase()
      if (l.includes('time') && l.includes('symbol') && l.includes('type') && (l.includes('profit') || l.includes('p&l'))) {
        headerIdx = i
        break
      }
    }
  }

  if (headerIdx === -1) return []

  const headerVals = lines[headerIdx].toLowerCase().split(',').map(v => v.trim().replace(/"/g,''))
  const colIdx = {
    openTime: headerVals.findIndex(h => h === 'time' || h === 'open time'),
    ticket: headerVals.findIndex(h => h === 'position' || h === 'ticket' || h === 'order'),
    symbol: headerVals.findIndex(h => h === 'symbol'),
    type: headerVals.findIndex(h => h === 'type'),
    volume: headerVals.findIndex(h => h === 'volume'),
    openPrice: headerVals.findIndex(h => h === 'price' || h === 'open price'),
    sl: headerVals.findIndex(h => h === 's / l' || h === 'sl' || h === 's/l'),
    tp: headerVals.findIndex(h => h === 't / p' || h === 'tp' || h === 't/p'),
    closeTime: headerVals.lastIndexOf('time') !== headerVals.indexOf('time') ? headerVals.lastIndexOf('time') : headerVals.findIndex(h => h === 'close time'),
    closePrice: headerVals.lastIndexOf('price') !== headerVals.indexOf('price') ? headerVals.lastIndexOf('price') : -1,
    profit: headerVals.findIndex(h => h === 'profit' || h === 'p&l' || h === 'net profit'),
  }

  const trades = []
  const seen = new Set()

  for (let i = headerIdx + 1; i < endIdx; i++) {
    const line = lines[i]
    if (!line || !(/^\d{4}/.test(line))) continue
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
    if (vals.length < 5) continue

    const type = (colIdx.type >= 0 ? vals[colIdx.type] : '').toLowerCase()
    if (!['buy','sell'].includes(type)) continue

    const closeTime = colIdx.closeTime >= 0 ? vals[colIdx.closeTime] : ''
    if (!closeTime || !/^\d{4}/.test(closeTime)) continue

    const openTime = colIdx.openTime >= 0 ? vals[colIdx.openTime] : vals[0]
    const ticket = colIdx.ticket >= 0 ? vals[colIdx.ticket] : vals[1]
    const profit = colIdx.profit >= 0 ? cleanNum(vals[colIdx.profit]) : cleanNum(vals[vals.length - 3])

    const id = `csv-${ticket}-${openTime.replace(/[\s:.]/g,'')}`
    if (seen.has(id)) continue
    seen.add(id)

    trades.push({
      id, openTime, ticket, type,
      volume: colIdx.volume >= 0 ? cleanNum(vals[colIdx.volume]) : 0,
      symbol: colIdx.symbol >= 0 ? vals[colIdx.symbol] : '',
      openPrice: colIdx.openPrice >= 0 ? cleanNum(vals[colIdx.openPrice]) : 0,
      sl: colIdx.sl >= 0 ? vals[colIdx.sl] : '',
      tp: colIdx.tp >= 0 ? vals[colIdx.tp] : '',
      closeTime,
      closePrice: colIdx.closePrice >= 0 ? cleanNum(vals[colIdx.closePrice]) : 0,
      profit,
      outcome: profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be',
    })
  }

  return trades.sort((a, b) => a.openTime.localeCompare(b.openTime))
}
