import Router from '@koa/router'

import category from './category'
import serviceAtlocation from './service-at-location'
import place from './place'
import relatedSearches from './related-searches'
import favorite from './favorite'
import taxonomy from './taxonomy'
import search from './search'
import service from './service'
import suggestion from './suggestion'
import organization from './organization'
import userActivity from './user-activity'

const router = new Router({
  prefix: '/api/v1'
})

router.use(serviceAtlocation.routes()).use(serviceAtlocation.allowedMethods())
router.use(place.routes()).use(place.allowedMethods())
router.use(favorite.routes()).use(favorite.allowedMethods())
router.use(taxonomy.routes()).use(taxonomy.allowedMethods())
router.use(search.routes()).use(search.allowedMethods())
router.use(service.routes()).use(service.allowedMethods())
router.use(organization.routes()).use(organization.allowedMethods())
router.use(suggestion.routes()).use(suggestion.allowedMethods())
router.use(userActivity.routes()).use(userActivity.allowedMethods())
router.use(relatedSearches.routes()).use(relatedSearches.allowedMethods())
router.use(category.routes()).use(category.allowedMethods())

export default router
