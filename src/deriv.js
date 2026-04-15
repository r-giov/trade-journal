// Deriv WebSocket API utility
// Docs: https://api.deriv.com

const WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1'

function send(ws, payload) {
  ws.send(JSON.stringify(payload))
}

export function derivFetchAccount(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL)
    const result = { balance: null, currency: null, mt5Accounts: [], loginid: null }
    let step = 'auth'
    let mt5Pending = 0

    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Connection timed out after 15 seconds'))
    }, 15000)

    ws.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('WebSocket error — check your internet connection'))
    }

    ws.onopen = () => send(ws, { authorize: token })

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.error) {
        clearTimeout(timeout)
        ws.close()
        reject(new Error(msg.error.message))
        return
      }

      if (msg.msg_type === 'authorize') {
        result.loginid = msg.authorize.loginid
        step = 'mt5_list'
        send(ws, { mt5_login_list: 1 })
      }

      if (msg.msg_type === 'mt5_login_list') {
        const realAccounts = msg.mt5_login_list.filter(a => a.account_type === 'real')
        if (!realAccounts.length) {
          clearTimeout(timeout)
          ws.close()
          reject(new Error('No real MT5 accounts found on this Deriv account'))
          return
        }
        mt5Pending = realAccounts.length
        step = 'mt5_settings'
        realAccounts.forEach(a => send(ws, { mt5_get_settings: 1, login: a.login }))
      }

      if (msg.msg_type === 'mt5_get_settings') {
        const s = msg.mt5_get_settings
        result.mt5Accounts.push({
          login: s.login,
          balance: s.balance,
          currency: s.currency,
          name: s.name,
          group: s.group,
          leverage: s.leverage,
        })
        mt5Pending--
        if (mt5Pending === 0) {
          clearTimeout(timeout)
          ws.close()
          // Use the account with the highest balance as primary
          const primary = result.mt5Accounts.sort((a, b) => b.balance - a.balance)[0]
          result.balance = primary.balance
          result.currency = primary.currency
          resolve(result)
        }
      }
    }
  })
}
