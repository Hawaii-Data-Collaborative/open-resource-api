import Router from '@koa/router'
import { loginRequired } from '../../middleware'
import { favoriteService } from '../../services'
import { BadRequestError } from '../../errors'

const router = new Router({
  prefix: '/favorite'
})

/**
 * Get all favorites for a specified user (based on current user being authorized)
 */
router.get('/', loginRequired(), async (ctx) => {
  const userId = ctx.state.user.id
  const favorites = await favoriteService.getFavorites(userId)
  ctx.body = favorites
})

router.get('/spids', loginRequired(), async (ctx) => {
  const userId = ctx.state.user.id
  const spids = await favoriteService.getFavoriteSiteProgramIds(userId)
  ctx.body = spids
})

/**
 * Get a favorite by ID. The service at location table supports both {service}-{location}
 * and {service} as valid formats for an ID. Depending on the format, the query needs to be slightly different.
 */
// router.get('/:id', loginRequired(), async (ctx) => {
//   const { id } = ctx.params
//   const userId = ctx.state.user.sub

//   if (!id || id.length === 0) throw new Error('Invalid ID provided')

//   let favorite
//   if (id.includes('-')) {
//     favorite = await prisma.favorite.findFirst({
//       where: {
//         user_id: userId,
//         service_at_location_id: id as string
//       }
//     })
//   } else {
//     favorite = await prisma.favorite.findFirst({
//       where: {
//         user_id: userId,
//         service_id: id as string
//       }
//     })
//   }

//   ctx.body = favorite
// })

/**
 * Create a new favorite based on the currently authorized user.
 */
router.post('/', loginRequired(), async (ctx) => {
  // @ts-ignore
  const { id } = ctx.request.body
  const userId = ctx.state.user.id
  if (!id || id.length === 0) throw new BadRequestError('Invalid ID')
  const favorite = await favoriteService.addFavorite(userId, id)
  ctx.body = favorite
})

/**
 * Delete a favorite based on the currently authorized user.
 */
router.delete('/:id', loginRequired(), async (ctx) => {
  const { id } = ctx.params
  const userId = ctx.state.user.id
  if (!id || id.length === 0) throw new BadRequestError('Invalid ID')
  const count = await favoriteService.removeFavorite(userId, id)
  ctx.body = count
})

export default router
