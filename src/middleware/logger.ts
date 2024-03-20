import { Middleware } from 'koa'

const debug = require('debug')('app:middleware:logger')

function logger(): Middleware {
  return async (ctx, next) => {
    debug('%s %s', ctx.method, ctx.originalUrl)
    next()
  }
}

export default logger
