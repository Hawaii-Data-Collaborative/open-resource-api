import { Middleware } from 'koa'
import { COOKIE_NAME } from '../constants'
import prisma from '../lib/prisma'
import { BadRequestError } from '../errors'

function loginRequired(): Middleware {
  return async (ctx, next) => {
    const sessionId = ctx.cookies.get(COOKIE_NAME)
    const session = await prisma.session.findFirst({ where: { id: sessionId } })
    if (!session) {
      throw new BadRequestError('Session expired')
    }
    const user = await prisma.user.findFirst({ where: { id: session.userId } })
    if (!user) {
      throw new BadRequestError('Session expired')
    }
    ctx.state.sessionId = sessionId
    ctx.state.user = user
    await next()
  }
}

export default loginRequired
