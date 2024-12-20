import Router from '@koa/router'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import { searchService } from '../../services'

const debug = require('debug')('app:routes:service-at-location')

const router = new Router({
  prefix: '/service-at-location'
})

router.get('/:id', async (ctx) => {
  try {
    const result = await searchService.buildResult(ctx.params.id)
    ctx.body = result
  } catch (err) {
    debug(err)
    if (err instanceof PrismaClientKnownRequestError || (err as Error).name === 'NotFoundError') {
      ctx.body = null
    } else {
      throw err
    }
  }
})

export default router
