import Router from '@koa/router'
import { BannerService } from '../../services'

const router = new Router({
  prefix: '/banner'
})

router.get('/', async (ctx) => {
  const bannerService = new BannerService(ctx)
  const banner = await bannerService.getBanner()
  ctx.body = banner
})

export default router
