import { agency as Agency } from '@prisma/client'
import prisma from '../lib/prisma'
import { Service } from './base'
import { translationFieldMap } from '../constants'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = require('debug')('app:services:agency')

export class AgencyService extends Service {
  translationFieldMapEntry = translationFieldMap.agency

  async translate(agencies: Agency | Agency[]) {
    const lang = this.lang
    if (lang === 'en') {
      return
    }
    if (!Array.isArray(agencies)) {
      agencies = [agencies]
    }
    const agencyIds = agencies.map((a) => a.id)
    const atlist = await prisma.agency_translation.findMany({
      where: { language: lang, agencyId: { in: agencyIds } }
    })
    const map: { [key: string]: Agency } = {}
    for (const a of agencies) {
      map[a.id] = a
    }
    for (const at of atlist) {
      map[at.agencyId].Name = at.name
      map[at.agencyId].Overview__c = at.overview
    }
  }
}
