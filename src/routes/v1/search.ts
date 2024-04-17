import Router from '@koa/router'
import { searchService } from '../../services'

const router = new Router({
  prefix: '/search'
})

router.get('/', async (ctx) => {
  const searchText = (ctx.query.q as string)?.trim()
  const taxonomies = (ctx.query.taxonomies as string)?.trim()
  const results = await searchService.search({ searchText, taxonomies })
  ctx.body = results
})

router.get('/filters', async (ctx) => {
  const searchText = (ctx.query.query as string)?.trim()
  const taxonomies = (ctx.query.taxonomies as string)?.trim()
  const filters = await searchService.getFilters(searchText, taxonomies)
  ctx.body = filters
})

export default router
