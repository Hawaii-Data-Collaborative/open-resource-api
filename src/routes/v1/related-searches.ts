import Router from '@koa/router'
import { trendService } from '../../services'

const router = new Router({
  prefix: '/related-searches'
})

router.get('/', async (ctx) => {
  const { searchText, userId } = ctx.query
  const relatedSearches = await trendService.getRelatedSearches(searchText as string, userId as string)
  ctx.body = relatedSearches
})

export default router
