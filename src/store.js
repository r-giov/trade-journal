function cleanNum(str) {
  if (!str) return 0
  // Handle "1,061.70" (comma thousands separator) and "- 18.70" (spaced minus)
  return parseFloat(str.replace(/\s/g, '').replace(/,(?=\d{3})/g, '')) || 0
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
  const trades = [], seen = new Set(), deals = []

  doc.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td')
    const vals = Array.from(cells).map(c => c.textContent.trim())
    if (cells.length === 15 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (type === 'balance') return
      deals.push({ time:vals[0], symbol:vals[2], type, direction:vals[4]?.toLowerCase(), volume:cleanNum(vals[5]), price:cleanNum(vals[6]), orderId:vals[7], profit:cleanNum(vals[12])||cleanNum(vals[11]) })
    }
    if (cells.length === 14 && /^\d{4}\.\d{2}\.\d{2}/.test(vals[0])) {
      const type = vals[3]?.toLowerCase()
      if (!['buy','sell'].includes(type)) return
      const id = `mt5-pos-${vals[1]}`
      if (seen.has(id)) return
      seen.add(id)
      const profit = cleanNum(vals[10])
      trades.push({ id, openTime:vals[0], ticket:vals[1], type, volume:cleanNum(vals[5]), symbol:vals[2], openPrice:cleanNum(vals[6]), closePrice:cleanNum(vals[8]), closeTime:'', sl:'', tp:'', profit, outcome:profit>0.5?'win':profit<-0.5?'loss':'be' })
    }
  })

  if (deals.length) {
    const openStack = {}
    deals.forEach(deal => {
      if (!openStack[deal.symbol]) openStack[deal.symbol] = []
      if (deal.direction === 'in') { openStack[deal.symbol].push(deal) }
      else if (deal.direction === 'out') {
        const open = openStack[deal.symbol].shift()
        if (!open) return
        const id = `mt5-${open.orderId}-${open.time.replace(/[\s:.]/g,'')}`
        if (seen.has(id)) return
        seen.add(id)
        trades.push({ id, openTime:open.time, ticket:open.orderId, type:open.type, volume:open.volume, symbol:open.symbol, openPrice:open.price, closePrice:deal.price, closeTime:deal.time, sl:'', tp:'', profit:deal.profit, outcome:deal.profit>0.5?'win':deal.profit<-0.5?'loss':'be' })
      }
    })
  }
  return trades.sort((a,b) => a.openTime.localeCompare(b.openTime))
}

// Parse a CSV line respecting quoted fields like "1,061.70"
function parseCSVLine(line) {
  const result = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result
}

export function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  if (!lines.length) return []

  // Find header row
  let headerIdx = -1
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].toLowerCase()
    if (l.includes('symbol') && l.includes('direction') ||
        l.includes('symbol') && l.includes('action') ||
        l.includes('symbol') && l.includes('type') && l.includes('profit') ||
        l.includes('position') && l.includes('symbol')) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().trim())

  // Map column names to indices flexibly
  const col = name => {
    const aliases = {
      openTime:   ['entrytime','open time','open_time','time','opentime'],
      closeTime:  ['exittime','close time','close_time','closetime'],
      ticket:     ['tradeid','ticket','position','order','id'],
      symbol:     ['symbol','instrument','pair'],
      type:       ['direction','type','action'],
      volume:     ['volume','size','lots','vol'],
      openPrice:  ['entryprice','open price','open_price','price','openprice'],
      closePrice: ['exitprice','close price','close_price','closeprice'],
      sl:         ['stoploss','stop loss','s / l','sl','s/l'],
      tp:         ['takeprofit','take profit','t / p','tp','t/p'],
      profit:     ['pnl','profit','p&l','net profit'],
      outcome:    ['outcome','result'],
    }
    const names = aliases[name] || [name]
    for (const n of names) {
      const idx = headers.findIndex(h => h.replace(/[_\s]/g,'') === n.replace(/[_\s]/g,'') || h === n)
      if (idx !== -1) return idx
    }
    return -1
  }

  const C = {
    openTime: col('openTime'), closeTime: col('closeTime'),
    ticket: col('ticket'), symbol: col('symbol'), type: col('type'),
    volume: col('volume'), openPrice: col('openPrice'), closePrice: col('closePrice'),
    sl: col('sl'), tp: col('tp'), profit: col('profit'), outcome: col('outcome'),
  }

  const trades = [], seen = new Set()

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || /^[,\s]*$/.test(line)) continue
    const vals = parseCSVLine(line)
    if (vals.length < 5) continue

    const type = (C.type >= 0 ? vals[C.type] : '').toLowerCase().trim()
    if (!['buy','sell'].includes(type)) continue

    const openTime = C.openTime >= 0 ? vals[C.openTime] : ''
    const ticket = C.ticket >= 0 ? vals[C.ticket] : String(i)
    const profit = C.profit >= 0 ? cleanNum(vals[C.profit]) : 0

    const id = `csv-${ticket}-${openTime.replace(/[\s:.]/g,'')}`
    if (seen.has(id)) continue
    seen.add(id)

    // Determine outcome
    let outcome = 'be'
    if (C.outcome >= 0 && vals[C.outcome]) {
      const o = vals[C.outcome].toLowerCase()
      outcome = o === 'win' ? 'win' : o === 'loss' ? 'loss' : profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be'
    } else {
      outcome = profit > 0.5 ? 'win' : profit < -0.5 ? 'loss' : 'be'
    }

    trades.push({
      id, openTime, ticket, type,
      volume:     C.volume >= 0     ? cleanNum(vals[C.volume])     : 0,
      symbol:     C.symbol >= 0     ? vals[C.symbol]               : '',
      openPrice:  C.openPrice >= 0  ? cleanNum(vals[C.openPrice])  : 0,
      closePrice: C.closePrice >= 0 ? cleanNum(vals[C.closePrice]) : 0,
      closeTime:  C.closeTime >= 0  ? vals[C.closeTime]            : '',
      sl:         C.sl >= 0         ? vals[C.sl]                   : '',
      tp:         C.tp >= 0         ? vals[C.tp]                   : '',
      profit, outcome,
    })
  }

  return trades.sort((a,b) => a.openTime.localeCompare(b.openTime))
}
