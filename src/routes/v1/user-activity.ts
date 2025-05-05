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
  // eslint-disable-next-line prefer-const
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
      data
    }
  })

  ctx.body = null
})

export default router
