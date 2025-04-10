import Router from '@koa/router'
import { LabelService } from '../../services'

const router = new Router({
  prefix: '/labels'
})

router.get('/', async (ctx) => {
  const lang = ctx.query.lang ?? 'en'
  if (ctx.session) {
    ctx.session.lang = lang
  }
  const labelService = new LabelService(ctx)
  ctx.body = labelService.getLabels()
})

export default router
