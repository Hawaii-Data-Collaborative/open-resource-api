import Router from '@koa/router'
import { instantSearch } from '../../services/search'

const router = new Router({
  prefix: '/suggestions'
})

router.get('/', async (ctx) => {
  const { searchText, userId } = ctx.query
  const suggestions = await instantSearch(searchText as string, userId as string)

  ctx.body = [
    ...suggestions.programs,
    ...suggestions.taxonomies,
    ...suggestions.relatedSearches,
    ...suggestions.trendingSearches
  ]
})

export default router
