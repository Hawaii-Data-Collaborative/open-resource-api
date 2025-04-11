import { Base } from './base'
import { cloneSorted } from './util'

const debug = require('debug')('app:cache')

const ONE_MINUTE = 1000 * 60
const TEN_MINUTES = ONE_MINUTE * 10

export class Cache extends Base {
  name: string
  ttl: number
  _data: any

  constructor(name: string, ttl: number = TEN_MINUTES) {
    super()
    this.name = name
    this._data = {}
    this.ttl = ttl
  }

  private getKey(k) {
    return typeof k === 'string' ? k : JSON.stringify(cloneSorted(k))
  }

  set(k, v) {
    const key = this.getKey(k)
    if (this._data[key]) {
      clearTimeout(this._data[key].timeoutId)
      delete this._data[key]
    }

    const timeoutId = setTimeout(() => {
      delete this._data[key]
    }, this.ttl)

    this._data[key] = {
      value: v,
      added: new Date(),
      timeoutId
    }

    debug('[set][%s] key=%s', this.name, key)
  }

  get(k) {
    const key = this.getKey(k)
    if (key in this._data) {
      debug('[get][%s] found, key=%s', this.name, key)
    } else {
      debug('[get][%s] not found, key=%s', this.name, key)
    }
    return this._data[key]?.value || null
  }
}

export const resultsCache = new Cache('results')
export const filtersCache = new Cache('filters')
export const labelsCache = new Cache('labels', ONE_MINUTE)
