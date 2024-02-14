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

export function getRandomString(len: number = 30) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let i = 0
  while (i < len) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
    i += 1
  }
  return result
}
