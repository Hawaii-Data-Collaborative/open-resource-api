import Router from '@koa/router'
import prisma from '../../lib/prisma'
import { getTrendingSearches } from '../../services/trends'

const router = new Router({
  prefix: '/suggestion'
})

router.get('/', async (ctx) => {
  let suggestions = await prisma.suggestion.findMany({ select: { id: true, text: true, taxonomies: true } })
  suggestions = suggestions.map((s) => ({ ...s, group: 'Taxonomy' }))
  const trendingSearchTextList = await getTrendingSearches()
  const trendingSearches = trendingSearchTextList
    .slice(0, 10)
    .map((text, i) => ({ id: -(i + 1), text, group: 'Trending' }))
  ctx.body = [...trendingSearches, ...suggestions]
})

export default router
