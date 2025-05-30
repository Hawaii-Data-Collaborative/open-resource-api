export function buildHours(prefix: string, open: string | null, close: string | null, t: (key: string) => string) {
  let hours: string
  if (open) open = open.replaceAll(' ', '')
  if (close) close = close.replaceAll(' ', '')

  if (open && close) {
    hours = `<span style="display: inline-block; width: 100px">${prefix}:</span> ${open} - ${close}`
  } else if (open) {
    hours = `<span style="display: inline-block; width: 100px">${prefix}:</span> ${t('Opens at')} ${open}`
  } else if (close) {
    hours = `<span style="display: inline-block; width: 100px">${prefix}:</span> ${t('Closes at')} ${close}`
  } else {
    hours = `<span style="display: inline-block; width: 100px">${prefix}:</span> ${t('Closed')}`
  }
  return hours
}

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const NUMERIC = '0123456789'

export function getRandomString(len = 30, characters: 'ALPHANUMERIC' | 'NUMERIC' = 'ALPHANUMERIC') {
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

export function parseTimeString(time: string) {
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

  return String(h).padStart(2, '0') + String(m).padStart(2, '0')
}

export function cloneSorted(obj: any) {
  const rv = {}
  const keys = Object.keys(obj).sort()
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'object' && v != null) {
      rv[k] = cloneSorted(v)
    } else {
      rv[k] = v
    }
  }
  return rv
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
