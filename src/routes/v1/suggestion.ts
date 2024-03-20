import Router from '@koa/router'
import { searchService } from '../../services'

const router = new Router({
  prefix: '/suggestions'
})

router.get('/', async (ctx) => {
  const { searchText, userId } = ctx.query
  const suggestions = await searchService.instantSearch(searchText as string, userId as string)

  ctx.body = [
    ...suggestions.taxonomies,
    ...suggestions.programs,
    ...suggestions.relatedSearches,
    ...suggestions.trendingSearches
  ]
})

export default router
