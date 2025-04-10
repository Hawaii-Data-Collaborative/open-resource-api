import { Context } from 'koa'

export class Service {
  ctx: Context | null
  lang: string

  constructor(ctxOrService?: Context | Service) {
    if (ctxOrService instanceof Service) {
      const svc = ctxOrService as Service
      this.ctx = svc.ctx
      this.lang = svc.lang
    } else if (ctxOrService) {
      const ctx = ctxOrService as Context
      this.ctx = ctx
      this.lang = ctx.session?.lang ?? 'en'
    } else {
      this.ctx = null
      this.lang = 'en'
    }
  }
}
