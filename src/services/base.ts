import fs from 'fs'
import { Context } from 'koa'
import { labelsCache } from '../cache'

const debug = require('debug')('app:services:base')

export class Service {
  protected ctx: Context | null
  protected lang: string
  private labels: any

  constructor(ctxOrService?: Context | Service | { lang: string }) {
    if (ctxOrService instanceof Service) {
      const svc = ctxOrService as Service
      this.ctx = svc.ctx
      this.lang = svc.lang
      this.labels = svc.labels
    } else if (ctxOrService) {
      const ctx = ctxOrService as Context
      this.ctx = ctx
      this.lang = ctx.lang ?? ctx.session?.lang ?? 'en'
    } else {
      this.ctx = null
      this.lang = 'en'
    }

    if (!this.labels) {
      this.init()
    }
  }

  private init() {
    const lang = this.lang
    if (lang === 'en') {
      this.labels = {}
      return
    }

    const cached = labelsCache.get(lang)
    if (cached) {
      this.labels = cached
      return
    }

    debug('[getLabels] lang=%s', lang)
    const filepath = `lang/${lang}.txt`
    const labels = {}
    if (fs.existsSync(filepath)) {
      const text = fs.readFileSync(filepath, 'utf8').trim()
      text.split('\n').forEach((line) => {
        const [key, value] = line.split('=')
        labels[key] = value
      })
    } else {
      debug('[getLabels][WARN] lang=%s not found', lang)
    }

    this.labels = labels
    labelsCache.set(lang, labels)
    return labels
  }

  getLabels() {
    return this.labels
  }

  t(key: string) {
    return this.labels[key] || key
  }
}
