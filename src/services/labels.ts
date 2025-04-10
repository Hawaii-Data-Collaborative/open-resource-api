import fs from 'fs'
import { Service } from './base'

const debug = require('debug')('app:services:labels')

export class LabelService extends Service {
  getLabels() {
    const lang = this.lang
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
}
