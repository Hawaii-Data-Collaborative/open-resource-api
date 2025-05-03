import fs from 'fs'
import path from 'path'
import Koa from 'koa'
import json from 'koa-json'
import bodyParser from 'koa-bodyparser'
import helmet from 'koa-helmet'
import morgan from 'koa-morgan'
import serve from 'koa-static'
import cors from '@koa/cors'
import nunjucks from 'nunjucks'
import pingRouter from './routes/ping'
import routerV1 from './routes/v1'
import sitemap from './routes/sitemap'
import { errorHandler } from './middleware'

const debug = require('debug')('app:server')

const app = new Koa()
const PORT = Number(process.env.PORT || '3001')
const HOSTNAME = process.env.HOSTNAME || 'localhost'
const ACCESS_LOG = process.env.ACCESS_LOG || `${process.cwd()}/access.log`

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

app.use(helmet())
app.use(cors(corsOptions))
app.use(json({ pretty: false, param: 'pretty' }))
app.use(bodyParser())

app.use(errorHandler())

// API Version 1 routes
app.use(pingRouter.routes())
app.use(routerV1.routes()).use(routerV1.allowedMethods())
app.use(sitemap.routes())

app.listen(PORT, HOSTNAME, () => console.log(`Listening on ${HOSTNAME}:${PORT}`))
