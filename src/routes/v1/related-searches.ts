import Router from '@koa/router'
import { TrendsService } from '../../services'

const router = new Router({
  prefix: '/related-searches'
})

router.get('/', async (ctx) => {
  const trendsService = new TrendsService(ctx)
  const { searchText, userId } = ctx.query
  const relatedSearches = await trendsService.getRelatedSearches(searchText as string, userId as string)
  ctx.body = relatedSearches
})

export default router
