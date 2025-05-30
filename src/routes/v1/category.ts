import Router from '@koa/router'
import { CategoryService } from '../../services'

const router = new Router({
  prefix: '/categories'
})

router.get('/', async (ctx) => {
  const service = new CategoryService(ctx)
  const categories = await service.getCategories()
  ctx.body = categories
})

export default router
