import Router from '@koa/router'
import { searchService } from '../../services'

const router = new Router({
  prefix: '/search'
})

router.get('/', async (ctx) => {
  const analyticsUserId = ctx.get('X-UID')
  const searchText = (ctx.query.q as string)?.trim()
  const taxonomies = (ctx.query.taxonomies as string)?.trim()
  const radius = ctx.query.radius != null ? Number(ctx.query.radius) : undefined
  const lat = ctx.query.lat != null ? Number(ctx.query.lat) : undefined
  const lng = ctx.query.lon != null ? Number(ctx.query.lon) : undefined
  const zipCode = ctx.query.zipCode != null ? Number(ctx.query.zipCode) : undefined
  const results = await searchService.search({ searchText, taxonomies, radius, lat, lng, zipCode, analyticsUserId })
  ctx.body = results
})

router.get('/filters', async (ctx) => {
  const searchText = (ctx.query.query as string)?.trim()
  const taxonomies = (ctx.query.taxonomies as string)?.trim()
  const filters = await searchService.getFilters(searchText, taxonomies)
  ctx.body = filters
})

export default router
