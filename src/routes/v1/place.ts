import Router from '@koa/router'
import axios from 'axios'

const router = new Router({
  prefix: '/place'
})

router.get('/', async (ctx) => {
  const { q } = ctx.query
  const sessionId = ctx.state.sessionId

  if (!sessionId || sessionId.length === 0) throw new Error('Invalid session ID')

  if (!q || q.length === 0) throw new Error('Invalid query')

  const res = await axios.post(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${q}&types=geocode&language=en&key=${process.env.GOOGLE_API_KEY}&sessiontoken=${sessionId}&components=country:us&location=${process.env.CENTER_LAT},${process.env.CENTER_LON}&radius=184666`
  )

  ctx.body = res.data.predictions
})

export default router
