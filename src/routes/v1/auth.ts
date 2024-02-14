import Router from '@koa/router'

import { authService } from '../../services'
import { loginRequired } from '../../middleware'

const router = new Router({
  prefix: '/auth'
})

router.post('/signup', async (ctx) => {
  const { email, password } = ctx.request.body as any
  const { user } = await authService.signup(email, password, ctx)
  ctx.body = {
    id: user.id,
    email: user.email
  }
})

router.post('/login', async (ctx) => {
  const { email, password } = ctx.request.body as any
  const { user } = await authService.login(email, password, ctx)
  ctx.body = {
    id: user.id,
    email: user.email
  }
})

router.post('/logout', loginRequired(), async (ctx) => {
  await authService.logout(ctx)
})

export default router
