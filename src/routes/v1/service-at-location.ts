import Router from '@koa/router'
import { Prisma } from '@prisma/client'
import { searchService } from '../../services'

const debug = require('debug')('app:routes:service-at-location')

const router = new Router({
  prefix: '/service-at-location'
})

router.get('/:id', async (ctx) => {
  debug(ctx.url)
  try {
    const result = await searchService.buildResult(ctx.params.id)
    ctx.body = result
  } catch (err) {
    debug(err)
    if (err instanceof Prisma.PrismaClientKnownRequestError || (err as Error).name === 'NotFoundError') {
      ctx.body = null
    } else {
      throw err
    }
  }
})

export default router
