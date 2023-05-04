import Router from '@koa/router'
import { getBanner } from '../../services/banner'

const router = new Router({
  prefix: '/banner'
})

router.get('/', async (ctx) => {
  const banner = await getBanner()
  ctx.body = banner
})

export default router
