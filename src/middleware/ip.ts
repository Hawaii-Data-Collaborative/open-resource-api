import axios from 'axios'
import { Middleware } from 'koa'
import { COOKIE_NAME } from '../constants'

const debug = require('debug')('app:middleware:ip')

function ip(): Middleware {
  return async (ctx, next) => {
    let cookie = ctx.cookies.get(COOKIE_NAME)
    if (cookie) {
      const zip = Buffer.from(cookie, 'base64').toString('ascii')
      ctx.state.zip = zip
    } else {
      const url = `http://ip-api.com/json/${ctx.ip}?fields=country,regionName,city,zip`
      try {
        const res = await axios.get(url)
        const { zip } = res.data
        debug('url=%s zip=%s', url, zip)
        if (zip) {
          const encodedZip = Buffer.from(zip).toString('base64')
          ctx.cookies.set(COOKIE_NAME, encodedZip, {
            httpOnly: true,
            secure: true,
            expires: new Date('2100-01-01'),
            sameSite: 'strict'
          })
          ctx.state.zip = zip
        }
      } catch (err) {
        console.error(err)
      }
    }

    await next()
  }
}

export default ip
