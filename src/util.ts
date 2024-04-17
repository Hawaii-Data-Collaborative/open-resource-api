export function buildHours(prefix: string, open: string | null, close: string | null) {
  let hours: string
  if (open) open = open.replaceAll(' ', '')
  if (close) close = close.replaceAll(' ', '')

  if (open && close) {
    hours = `<span style="display: inline-block; width: 35px">${prefix}:</span>${open} - ${close}`
  } else if (open) {
    hours = `${prefix}: opens at ${open}`
  } else if (close) {
    hours = `${prefix}: closes at ${close}`
  } else {
    hours = `<span style="display: inline-block; width: 35px">${prefix}:</span>-`
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

export function timeStringToDate(time: string) {
  const re = /(\d+):(\d+)\s?(am|pm)/i
  const match = re.exec(time)
  if (!match) {
    return null
  }
  let h = Number(match[1])
  const m = Number(match[2])
  const z = match[3].toLowerCase()
  if (z === 'am' && h === 12) {
    h = 0
  } else if (z === 'pm' && h < 12) {
    h += 12
  }
  const date = new Date()
  const Y = date.getFullYear()
  const M = date.getMonth()
  const D = date.getDate()
  const result = new Date(Y, M, D, h, m)
  return result
}
