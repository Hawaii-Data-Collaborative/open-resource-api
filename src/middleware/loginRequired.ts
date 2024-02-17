import { Middleware } from 'koa'
import prisma from '../lib/prisma'
import { BadRequestError } from '../errors'

function loginRequired(): Middleware {
  return async (ctx, next) => {
    const token = ctx.get('Authorization').replace('Bearer ', '')
    const sessionId = Buffer.from(token, 'base64').toString('utf-8')
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
