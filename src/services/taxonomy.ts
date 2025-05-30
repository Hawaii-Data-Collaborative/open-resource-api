import { taxonomy as Taxonomy } from '@prisma/client'
import prisma from '../lib/prisma'
import { Service } from './base'
import { translationFieldMap } from '../constants'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = require('debug')('app:services:taxonomy')

export class TaxonomyService extends Service {
  translationFieldMapEntry = translationFieldMap.taxonomy

  async translate(taxonomies: Taxonomy | Taxonomy[]) {
    const lang = this.lang
    if (lang === 'en') {
      return
    }
    if (!Array.isArray(taxonomies)) {
      taxonomies = [taxonomies]
    }
    const taxonomyIds = taxonomies.map((t) => t.id)
    const ttlist = await prisma.taxonomy_translation.findMany({
      where: { language: lang, taxonomyId: { in: taxonomyIds } }
    })
    const map: { [key: string]: Taxonomy } = {}
    for (const t of taxonomies) {
      map[t.id] = t
    }
    for (const tt of ttlist) {
      map[tt.taxonomyId].Name = tt.name as string
      // map[tt.taxonomyId].Definition__c = tt.definition
    }
  }
}
