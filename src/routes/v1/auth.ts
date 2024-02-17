import Router from '@koa/router'
import { authService } from '../../services'
import { loginRequired } from '../../middleware'

const router = new Router({
  prefix: '/auth'
})

const buildAuthResponse = (user, session?) => ({
  user: { email: user.email },
  token: session ? Buffer.from(session.id).toString('base64') : undefined
})

router.post('/signup', async (ctx) => {
  const { email, password } = ctx.request.body as any
  const { user, session } = await authService.signup(email, password)
  ctx.body = buildAuthResponse(user, session)
})

router.post('/login', async (ctx) => {
  const { email, password } = ctx.request.body as any
  const { user, session } = await authService.login(email, password)
  ctx.body = buildAuthResponse(user, session)
})

router.get('/session', loginRequired(), async (ctx) => {
  const { user } = ctx.state
  ctx.body = buildAuthResponse(user)
})

router.post('/delete-account', loginRequired(), async (ctx) => {
  const { user } = ctx.state
  const result = await authService.deleteAccount(user)
  ctx.body = result
})

export default router
