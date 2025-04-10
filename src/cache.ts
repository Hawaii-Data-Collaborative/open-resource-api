import { Base } from './base'
import { cloneSorted } from './util'

const debug = require('debug')('app:cache')

export class Cache extends Base {
  name: string
  _data: any

  constructor(name: string) {
    super()
    this.name = name
    this._data = {}
  }

  set(k, v) {
    const key = JSON.stringify(cloneSorted(k))
    if (this._data[key]) {
      clearTimeout(this._data[key].timeoutId)
      delete this._data[key]
    }

    const timeoutId = setTimeout(() => {
      delete this._data[key]
    }, 1000 * 60 * 10)

    this._data[key] = {
      value: v,
      added: new Date(),
      timeoutId
    }

    debug('[set][%s] key=%s', this.name, key)
  }

  get(k) {
    const key = JSON.stringify(cloneSorted(k))
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
