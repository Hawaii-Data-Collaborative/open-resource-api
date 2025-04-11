import Router from '@koa/router'
import { LabelService } from '../../services'

const debug = require('debug')('app:routes:labels')

const router = new Router({
  prefix: '/labels'
})

router.get('/', async (ctx) => {
  const lang = ctx.query.lang ?? 'en'
  if (ctx.session) {
    if (ctx.session.lang) {
      if (ctx.session.lang !== lang) {
        debug('updating session lang from %s to %s', ctx.session.lang, lang)
        ctx.session.lang = lang
      }
    } else {
      debug('setting session lang to %s', lang)
      ctx.session.lang = lang
    }
  }

  let rv = {}
  if (lang !== 'en') {
    const labelService = new LabelService(ctx)
    rv = labelService.getLabels()
  }
  ctx.body = rv
})

export default router
