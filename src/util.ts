export function buildHours(prefix: string, open: string | null, close: string | null) {
  let hours: string
  if (open) open = open.replaceAll(' ', '')
    if (close) close = close.replaceAll(' ', '')

  if (open && close) {
    hours = `<span style="display: inline-block; width: 100px">${prefix}:</span>${open} - ${close}`
  } else if (open) {
    hours = `${prefix}: opens at ${open}`
  } else if (close) {
    hours = `${prefix}: closes at ${close}`
  } else {
    hours = `<span style="display: inline-block; width: 100px">${prefix}:</span>Closed`
  }
  return hours
}

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const NUMERIC = '0123456789'

export function getRandomString(len: number = 30, characters: 'ALPHANUMERIC' | 'NUMERIC' = 'ALPHANUMERIC') {
  let result = ''
  let i = 0
  while (i < len) {
    const chars = characters === 'ALPHANUMERIC' ? ALPHANUMERIC : NUMERIC
    result += chars.charAt(Math.floor(Math.random() * chars.length))
    i += 1
  }
  return result
}

export function decodeToken(token: string) {
  return Buffer.from(token, 'base64').toString('utf-8')
}
