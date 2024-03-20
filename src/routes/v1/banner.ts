import Router from '@koa/router'
import { bannerService } from '../../services'

const router = new Router({
  prefix: '/banner'
})

router.get('/', async (ctx) => {
  const banner = await bannerService.getBanner()
  ctx.body = banner
})

export default router
