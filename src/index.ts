import fs from 'fs'
import path from 'path'
import Koa from 'koa'
import cors from '@koa/cors'
import { send } from '@koa/send'
import bodyParser from 'koa-bodyparser'
import helmet from 'koa-helmet'
import json from 'koa-json'
import morgan from 'koa-morgan'
import proxy from 'koa-proxies'
import serve from 'koa-static'
import nunjucks from 'nunjucks'
import pingRouter from './routes/ping'
import routerV1 from './routes/v1'
import sitemap from './routes/sitemap'
import { errorHandler } from './middleware'
import { startCron } from './cron'

const debug = require('debug')('app:server')

const app = new Koa()
const PORT = Number(process.env.PORT || '8080')
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || 'http://localhost:8081'
const ACCESS_LOG = process.env.ACCESS_LOG || `${process.cwd()}/access.log`
const CRON_ENABLED = process.env.CRON_ENABLED === '1'

nunjucks.configure('templates', { noCache: true })

const FRONTEND_DIR = process.env.FRONTEND_DIR
if (FRONTEND_DIR) {
  const dir = path.resolve(FRONTEND_DIR)
  if (fs.existsSync(dir)) {
    app.use(serve(dir))
    debug('serving frontend, dir=%s', dir)
  } else {
    throw new Error(`FRONTEND_DIR ${dir} does not exist`)
  }
} else {
  debug('FRONTEND_DIR is empty')
}

morgan.token('remote-addr', (req) => req.headers['x-real-ip'])
const stream = fs.createWriteStream(ACCESS_LOG, { flags: 'a' })
app.use(morgan('combined', { stream }))

// Use proxy in production (required for ctx.hostname to work properly when behind a proxy)
if (app.env === 'production') {
  app.proxy = true
}

let corsOptions
if (app.env === 'development') {
  corsOptions = { credentials: true }
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [
          "'self'",
          'data:',
          '*.googleapis.com',
          '*.gstatic.com',
          '*.googletagmanager.com',
          '*.cloudflare.com'
        ],
        scriptSrc: [
          "'self'",
          "'nonce-hdc-zI1Rd93a8q1vh0CUwoeNf'",
          '*.googleapis.com',
          '*.gstatic.com',
          '*.googletagmanager.com',
          '*.cloudflare.com'
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", '*.googleapis.com']
      }
    }
  })
)
app.use(cors(corsOptions))
app.use(json({ pretty: false, param: 'pretty' }))
app.use(bodyParser())

// Proxy /admin requests to Express server
app.use(proxy('/admin', { target: ADMIN_ORIGIN, changeOrigin: true }))

app.use(errorHandler())

// API Version 1 routes
app.use(pingRouter.routes())
app.use(routerV1.routes()).use(routerV1.allowedMethods())
app.use(sitemap.routes())

const fileSuffixes = ['js', 'css', 'map', 'txt', 'jpg', 'jpeg', 'png', 'svg']

app.use((ctx, next) => {
  debug('[middleware] %s env=%s', ctx.path, app.env)
  if (app.env === 'production') {
    let isFileLike
    try {
      const lastPart = ctx.path.split('/').pop()
      isFileLike = lastPart ? fileSuffixes.includes(lastPart.split('.').pop() || '') : false
    } catch {
      // no op
    }
    if (isFileLike === false) {
      return send(ctx, 'public/index.html')
    }
  }
  next()
})

app.listen(PORT, () => debug('App server listening on port %s', PORT))

if (CRON_ENABLED) {
  startCron()
}

process.on('uncaughtException', (err) => {
  debug('[uncaughtException] %s', err)
})

process.on('unhandledRejection', (reason, promise) => {
  debug('[unhandledRejection] %s %s', reason, promise)
})
