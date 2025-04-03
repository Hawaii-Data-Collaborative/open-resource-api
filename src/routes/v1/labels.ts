import Router from '@koa/router'
import { labelService } from '../../services'

const router = new Router({
  prefix: '/labels'
})

router.get('/', async (ctx) => {
  const lang = ctx.query.lang ?? 'en'
  ctx.body = labelService.getLabels(lang)
})

export default router
