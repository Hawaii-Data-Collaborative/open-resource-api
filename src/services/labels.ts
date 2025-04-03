import fs from 'fs'
const debug = require('debug')('app:services:labels')

export function getLabels(lang) {
  debug('[getLabels] lang=%s', lang)
  const filepath = `lang/${lang}.txt`
  let rv = {}
  if (fs.existsSync(filepath)) {
    const text = fs.readFileSync(filepath, 'utf8')
    text.split('\n').forEach((line) => {
      const [key, value] = line.split('=')
      rv[key] = value
    })
  } else {
    debug('[getLabels][WARN] lang=%s not found', lang)
  }
  return rv
}
