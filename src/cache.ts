import { Base } from './base'

class Cache extends Base {
  name: string
  _data: any

  constructor(name: string) {
    super()
    this.name = name
    this._data = {}
  }

  set(k, v) {
    const key = JSON.stringify(k)
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
  }

  get(k) {
    const key = JSON.stringify(k)
    return this._data[key]?.value || null
  }
}

export const resultsCache = new Cache('results')
export const filtersCache = new Cache('filters')
