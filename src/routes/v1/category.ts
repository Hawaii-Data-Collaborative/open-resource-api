import Router from '@koa/router'
import { categoryService } from '../../services'

const router = new Router({
  prefix: '/categories'
})

router.get('/', async (ctx) => {
  const categories = await categoryService.getCategories()
  ctx.body = categories
})

export default router
