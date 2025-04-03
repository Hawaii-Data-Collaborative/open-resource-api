import Router from '@koa/router'
import { labelService } from '../../services'

const router = new Router({
  prefix: '/labels'
})

router.get('/', async (ctx) => {
  const lang = ctx.query.lang ?? 'en'
  if (ctx.session) {
    ctx.session.lang = lang
  }
  ctx.body = labelService.getLabels(lang)
})

export default router
