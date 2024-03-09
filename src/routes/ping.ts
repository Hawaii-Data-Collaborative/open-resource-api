import Router from '@koa/router'

const BASE_PREFIX = process.env.BASE_PREFIX || ''
const router = new Router({
  prefix: `${BASE_PREFIX}/api/ping`
})

router.get('/', (ctx) => {
  ctx.body = 'pong'
})

export default router
