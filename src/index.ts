import Koa from 'koa'
import json from 'koa-json'
import bodyParser from 'koa-bodyparser'
import helmet from 'koa-helmet'
import cors from '@koa/cors'
import pingRouter from './routes/ping'
import routerV1 from './routes/v1'
import { errorHandler, logger } from './middleware'

const app = new Koa()
const PORT = Number(process.env.PORT || '3001')
const HOSTNAME = process.env.HOSTNAME || 'localhost'

app.use(logger())

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

app.listen(PORT, HOSTNAME, () => console.log(`Listening on ${HOSTNAME}:${PORT}`))
