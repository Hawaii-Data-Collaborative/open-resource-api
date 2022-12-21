import Router from '@koa/router'
import { getRelatedSearches } from '../../services/trends'

const router = new Router({
  prefix: '/related-searches'
})

router.get('/', async (ctx) => {
  const { searchText, userId } = ctx.query
  const relatedSearches = await getRelatedSearches(searchText as string, userId as string)
  ctx.body = relatedSearches
})

export default router
