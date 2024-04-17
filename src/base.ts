export class Base {
  toString() {
    const className = this.constructor.name

    const instanceVariables = Object.entries(this)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([key, value]) => typeof value !== 'function')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')

    return `${className}(${instanceVariables})`
  }
}
