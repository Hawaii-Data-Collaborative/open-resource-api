import Router from '@koa/router'
import { cron } from '../../cron'
import { loginRequired } from '../../middleware'

const debug = require('debug')('app:routes:admin')

const router = new Router({
  prefix: '/admin'
})

router.get('/cron', loginRequired(true), async (ctx) => {
  const status = cron.getStatus()
  ctx.body = status
})

router.post('/cron', loginRequired(true), async (ctx) => {
  const { action, job } = ctx.query
  if (action === 'start') {
    cron.start(job as any)
    debug('%s started by userId %s', job, ctx.state.user.id)
  } else if (action === 'stop') {
    cron.stop(job as any)
    debug('%s stopped by userId %s', job, ctx.state.user.id)
  }
  ctx.status = 204
})

export default router
