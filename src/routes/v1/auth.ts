import Router from '@koa/router'
import { AuthService } from '../../services'
import { loginRequired } from '../../middleware'

const router = new Router({
  prefix: '/auth'
})

const buildAuthResponse = (user, session?) => ({
  user: { email: user.email },
  token: session ? Buffer.from(session.id).toString('base64') : undefined
})

router.post('/signup', async (ctx) => {
  const authService = new AuthService(ctx)
  const { email, password } = ctx.request.body as any
  const { user, session } = await authService.signup(email, password)
  ctx.body = buildAuthResponse(user, session)
})

router.post('/login', async (ctx) => {
  const authService = new AuthService(ctx)
  const { email, password } = ctx.request.body as any
  const { user, session } = await authService.login(email, password)
  ctx.body = buildAuthResponse(user, session)
})

router.get('/session', loginRequired(), async (ctx) => {
  const { user } = ctx.state
  ctx.body = buildAuthResponse(user)
})

router.post('/send-code', async (ctx) => {
  const authService = new AuthService(ctx)
  const { email } = ctx.request.body as any
  const { session } = await authService.sendPasswordResetCode(email)
  ctx.body = session.id
})

router.post('/check-code', async (ctx) => {
  const authService = new AuthService(ctx)
  const { code, token } = ctx.request.body as any
  await authService.checkPasswordResetCode(code, token)
  ctx.body = null
})

router.post('/reset-password', async (ctx) => {
  const authService = new AuthService(ctx)
  const { password, token } = ctx.request.body as any
  const { user, session } = await authService.resetPassword(password, token)
  ctx.body = buildAuthResponse(user, session)
})

router.post('/delete-account', loginRequired(), async (ctx) => {
  const authService = new AuthService(ctx)
  const { user } = ctx.state
  const result = await authService.deleteAccount(user)
  ctx.body = result
})

router.post('/verify-token', async (ctx) => {
  const authService = new AuthService(ctx)
  const { token } = ctx.request.body as any
  const result = await authService.verifyToken(token, ctx.ip)
  ctx.body = result
})

export default router
