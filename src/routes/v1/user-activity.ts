import Router from '@koa/router'

import prisma from '../../lib/prisma'
import { ip } from '../../middleware'

interface CreateUserActivityInput {
  userId: string
  event: string
  data: any
}

const router = new Router({
  prefix: '/user-activity'
})

router.post('/', ip(), async (ctx) => {
  let { userId, event, data } = ctx.request.body as unknown as CreateUserActivityInput
  if (!data) {
    data = {}
  }
  if (ctx.state.zip) {
    data.zip = ctx.state.zip
  }

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
