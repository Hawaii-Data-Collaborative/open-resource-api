import Router from '@koa/router'
import { searchService } from '../../services'

const router = new Router({
  prefix: '/search'
})

/**
 * Build elasticsearch queries, filter out duplicates, and send back to client
 */
router.get('/', async (ctx) => {
  const searchText = (ctx.query.q as string)?.trim()
  const taxonomies = (ctx.query.taxonomies as string)?.trim()
  const results = await searchService.search({ searchText, taxonomies })
  ctx.body = results
})

export default router
