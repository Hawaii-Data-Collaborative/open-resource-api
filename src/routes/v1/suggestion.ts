import Router from '@koa/router'
// import prisma from '../../lib/prisma'
import { getRelatedSearches, getTrendingSearches } from '../../services/trends'

const router = new Router({
  prefix: '/suggestion'
})

router.get('/', async (ctx) => {
  const { searchText, userId } = ctx.query
  const suggestions: any[] = []
  // let suggestions = await prisma.suggestion.findMany({ select: { id: true, text: true, taxonomies: true } })
  // suggestions = suggestions.map((s) => ({ ...s, group: 'Taxonomy' }))
  const trendingSearchTextList = await getTrendingSearches()
  const trendingSearches = trendingSearchTextList.map((text: any, i: number) => ({
    id: -(i + 1),
    text,
    group: 'Trending'
  }))
  let relatedSearches
  if (searchText && userId) {
    relatedSearches = await getRelatedSearches(searchText as string, userId as string)
    relatedSearches = relatedSearches.map((text, i) => ({ id: -(i + 1001), text, group: 'Related searches' }))
  }

  ctx.body = relatedSearches
    ? [...relatedSearches, ...trendingSearches, ...suggestions]
    : [...trendingSearches, ...suggestions]
})

export default router
