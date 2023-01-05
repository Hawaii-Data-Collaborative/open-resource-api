import Router from '@koa/router'
import { getCategories } from '../../services/categories'

const router = new Router({
  prefix: '/categories'
})

router.get('/', async (ctx) => {
  const categories = await getCategories()
  ctx.body = categories
})

export default router
