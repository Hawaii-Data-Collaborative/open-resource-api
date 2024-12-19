import Router from '@koa/router'
import { searchService } from '../../services'

const router = new Router({
  prefix: '/search'
})

function parseQuery(query) {
  const searchText = query.q?.trim()
  const taxonomies = query.taxonomies?.trim()
  const radius = query.radius != null ? Number(query.radius) : undefined
  const lat = query.lat != null ? Number(query.lat) : undefined
  const lng = query.lon != null ? Number(query.lon) : undefined
  const zipCode = query.zipCode != null ? Number(query.zipCode) : undefined
  const filters = query.filters != null ? JSON.parse(decodeURIComponent(query.filters)) : undefined
  return { searchText, taxonomies, radius, lat, lng, zipCode, filters }
}

router.get('/', async (ctx) => {
  const analyticsUserId = ctx.get('X-UID')
  const input = parseQuery(ctx.query)
  const rv = await searchService.search(input, { analyticsUserId })
  ctx.body = rv
})

router.get('/facets', async (ctx) => {
  const analyticsUserId = ctx.get('X-UID')
  const input = parseQuery(ctx.query)
  const rv = await searchService.getFacets(input, { analyticsUserId })
  ctx.body = rv
})

export default router
