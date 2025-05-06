import Router from '@koa/router'
import { startCron, stopCron } from '../../cron'
import { loginRequired } from '../../middleware'

const debug = require('debug')('app:routes:admin')

const router = new Router({
  prefix: '/admin'
})

router.post('/start-cron', loginRequired(true), async (ctx) => {
  debug(ctx.url)
  startCron()
  ctx.body = { message: 'Cron started' }
})

router.post('/stop-cron', loginRequired(true), async (ctx) => {
  debug(ctx.url)
  stopCron()
  ctx.body = { message: 'Cron stopped' }
})

export default router
