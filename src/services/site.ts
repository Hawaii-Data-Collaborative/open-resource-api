import { site as Site } from '@prisma/client'
import prisma from '../lib/prisma'
import { Service } from './base'
import { translationFieldMap } from '../constants'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = require('debug')('app:services:site')

export class SiteService extends Service {
  translationFieldMapEntry = translationFieldMap.site

  async translate(sites: Site | Site[]) {
    const lang = this.lang
    if (lang === 'en') {
      return
    }
    if (!Array.isArray(sites)) {
      sites = [sites]
    }
    const siteIds = sites.map((s) => s.id)
    const stlist = await prisma.site_translation.findMany({
      where: { language: lang, siteId: { in: siteIds } }
    })
    const map: { [key: string]: Site } = {}
    for (const s of sites) {
      map[s.id] = s
    }
    for (const st of stlist) {
      map[st.siteId].Name = st.name
    }
  }
}
