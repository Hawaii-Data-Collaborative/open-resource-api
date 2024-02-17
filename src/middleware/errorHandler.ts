import { Middleware } from 'koa'
import { AppError } from '../errors'

const serverError = {
  status: 500,
  message: 'Internal Server Error'
}

function errorHandler(): Middleware {
  return async (ctx, next) => {
    try {
      await next()
    } catch (err: any) {
      console.error(err)
      const userError = err instanceof AppError ? err : serverError
      ctx.status = userError.status || 500
      ctx.body = {
        message: userError.message
      }
    }
  }
}

export default errorHandler
