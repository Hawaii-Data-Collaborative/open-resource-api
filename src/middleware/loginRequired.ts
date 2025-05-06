import { Middleware } from 'koa'
import prisma from '../lib/prisma'
import { BadRequestError } from '../errors'
import { decodeToken } from '../util'

function loginRequired(adminOnly = false): Middleware {
  return async (ctx, next) => {
    const token = ctx.get('Authorization').replace('Bearer ', '')
    if (!token) {
      throw new BadRequestError('Token is required')
    }
    const sessionId = decodeToken(token)
    const session = await prisma.session.findFirst({ where: { id: sessionId } })
    if (!session) {
      throw new BadRequestError('Session expired')
    }
    const user = await prisma.user.findFirst({ where: { id: session.userId } })
    if (!user) {
      throw new BadRequestError('Session expired')
    }
    if (adminOnly && user.type !== 'ADMIN') {
      throw new BadRequestError('Unauthorized')
    }
    ctx.state.sessionId = sessionId
    ctx.state.user = user
    await next()
  }
}

export default loginRequired
