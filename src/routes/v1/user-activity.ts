import Router from '@koa/router'

import prisma from '../../lib/prisma'

interface CreateUserActivityInput {
  userId: string
  event: string
  data: Object
}

const router = new Router({
  prefix: '/user-activity'
})

router.post('/', async (ctx) => {
  const { userId, event, data } = ctx.request.body as unknown as CreateUserActivityInput

  await prisma.user_activity.create({
    data: {
      userId,
      event,
      data: data ? JSON.stringify(data) : null,
      createdAt: new Date().toJSON(),
      updatedAt: new Date().toJSON()
    }
  })

  ctx.body = null
})

export default router
