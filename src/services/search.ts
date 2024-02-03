import {
  agency as Agency,
  program as Program,
  taxonomy as Taxonomy,
  site as Site,
  site_program as SiteProgram
} from '@prisma/client'
import _ from 'lodash'
import meilisearch from '../lib/meilisearch'
import prisma from '../lib/prisma'
import { getRelatedSearches, getTrendingSearches } from './trends'

const debug = require('debug')('app:services:search')

let taxonomiesByCode: any
let taxonomiesByName: any

async function findProgramsByTaxonomyIds(taxIds: string[]) {
  const psList = await prisma.program_service.findMany({
    select: { Program__c: true },
    where: { Taxonomy__c: { in: taxIds } }
  })
  const programIds = psList.map((ps) => ps.Program__c)
  const programs = await prisma.program.findMany({
    where: {
      Status__c: { not: 'Inactive' },
      id: { in: programIds }
    }
  })
  return programs
}

export async function search({ searchText = '', taxonomies = '', searchTaxonomyIndex = false } = {}) {
  debug('[search] searchText=%s taxonomies=%s searchTaxonomyIndex=%s', searchText, taxonomies, searchTaxonomyIndex)
  if (!taxonomiesByCode) {
    debug('[search] populating taxonomiesByCode')
    const arr = await prisma.taxonomy.findMany({ where: { Status__c: { not: 'Inactive' } } })
    taxonomiesByCode = {}
    taxonomiesByName = {}
    for (const t of arr) {
      taxonomiesByCode[t.Code__c] = t
      taxonomiesByName[t.Name] = t
    }
  }

  const results = []
  let programs: Program[] = []

  if (searchText) {
    if (taxonomiesByCode[searchText]) {
      const tid = (taxonomiesByCode[searchText] as Taxonomy).id
      debug('[search] found taxonomy in taxonomiesByCode, searchText=%s tid=%s', searchText, tid)
      programs = await findProgramsByTaxonomyIds([tid])
      debug('[search] found %s programs for that taxonomy', programs.length)
    }

    if (!programs.length) {
      const res = await meilisearch.index('program').search(searchText, { limit: 500 })
      programs = res.hits as Program[]
      debug('[search] main search found %s programs', programs.length)

      if (searchTaxonomyIndex) {
        const res2 = await meilisearch.index('taxonomy').search(searchText, { limit: 500 })
        const taxIds = res2.hits.map((t) => t.id)
        const programs2 = await findProgramsByTaxonomyIds(taxIds)
        debug('[search] found %s additional programs in taxonomy search', programs2.length)
        programs = _.uniqBy([...programs, ...programs2], 'id')
      }
    }
  } else {
    programs = await prisma.program.findMany({ where: { Status__c: { not: 'Inactive' } } })
    debug('[search] no search text, loaded all %s programs', programs.length)
  }

  let filteredPrograms: Program[] = []
  if (taxonomies) {
    debug('[search] processing taxonomies input')
    const taxonomyCodes = taxonomies.split(',').map((s) => s.trim())
    const filteredTaxonomies: Taxonomy[] = []
    for (const code of taxonomyCodes) {
      if (taxonomiesByCode[code]) {
        debug('[search] found code %s in taxonomiesByCode', code)
        filteredTaxonomies.push(taxonomiesByCode[code])
      } else if (code.endsWith('*')) {
        const code2 = code.replaceAll('*', '').trim()
        if (code2.length) {
          const taxList = await prisma.taxonomy.findMany({
            where: {
              Code__c: { startsWith: code2 },
              Status__c: { not: 'Inactive' }
            }
          })
          debug('[search] found %s taxonomies for code %s', taxList.length, code)
          filteredTaxonomies.push(...taxList)
        } else {
          debug('[search] code2 is empty')
        }
      }
    }

    const taxIds = filteredTaxonomies.map((t) => t.id)
    const tmp = await findProgramsByTaxonomyIds(taxIds)
    debug('[search] added %s programs to search results based on taxonomy search', tmp.length)
    filteredPrograms.push(...tmp)
  } else {
    filteredPrograms = programs
  }

  const programIds = filteredPrograms.map((p) => p.id)
  const sitePrograms = await prisma.site_program.findMany({
    select: {
      id: true,
      Site__c: true,
      Program__c: true
    },
    where: {
      Program__c: {
        in: programIds
      }
    }
  })

  const siteIds = sitePrograms.map((sp) => sp.Site__c as string)
  const siteProgramMap: any = {}
  for (const sp of sitePrograms) {
    if (!siteProgramMap[sp.Program__c as string]) {
      siteProgramMap[sp.Program__c as string] = []
    }
    siteProgramMap[sp.Program__c as string].push(sp)
  }

  const sites = await prisma.site.findMany({
    where: {
      Status__c: { in: ['Active', 'Active - Online Only'] },
      id: {
        in: siteIds
      }
    }
  })

  const siteMap: any = {}
  for (const s of sites) {
    siteMap[s.id] = s
  }

  const agencyIds = _.compact(filteredPrograms.map((p) => p.Account__c as string))
  const agencies = await prisma.agency.findMany({
    where: {
      id: { in: agencyIds }
    }
  })
  const agencyMap: any = {}
  for (const a of agencies) {
    agencyMap[a.id] = a
  }

  for (const p of filteredPrograms) {
    const agency: Agency = agencyMap[p.Account__c as string]
    if (!['Active', 'Active - Online Only'].includes(agency.Status__c as string)) {
      debug('[search] skipping program %s, agency %s status=%s', p.Name, agency.Name, agency.Status__c)
      continue
    }
    const spList: SiteProgram[] = siteProgramMap[p.id]
    if (!spList?.length) {
      continue
    }
    for (const sp of spList) {
      const site: Site = siteMap[sp.Site__c as string]
      if (!site) {
        continue
      }

      const locationName = site.Name
      let physicalAddress = ''
      let locationLat = ''
      let locationLon = ''
      if (!site.Billing_Address_is_Confidential__c || site.Billing_Address_is_Confidential__c == '0') {
        let street = site.Street_Number__c
        if (street && site.City__c) {
          if (site.Suite__c) {
            street += ` ${site.Suite__c}`
          }
          physicalAddress = street
          if (site.Location__Latitude__s && site.Location__Longitude__s) {
            locationLat = site.Location__Latitude__s
            locationLon = site.Location__Longitude__s
          }
        }
      }

      results.push({
        _source: {
          id: sp.id, //
          service_name: p.Name, // - service_name, location_name, organization_name
          location_name: locationName,
          physical_address: physicalAddress,
          physical_address_city: site.City__c,
          physical_address_state: site.State__c,
          physical_address_postal_code: site.Zip_Code__c,
          location_latitude: locationLat,
          location_longitude: locationLon,
          service_short_description: p.Service_Description__c, // - service_short_description
          phone: p.Program_Phone_Text__c, //
          website: p.Website__c //
        },
        _score: 1 //
      })
    }
  }

  return results
}

export async function instantSearch(searchText: string, userId: string) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })

  const res1 = await meilisearch.index('program').search(searchText, { limit: 10 })
  const programs = res1.hits.map((p) => ({ id: p.id, text: p.Name }))

  let taxonomies: any[] = []
  if (settings?.enableTaxonomySearches) {
    const res2 = await meilisearch.index('taxonomy').search(searchText, { limit: 10 })
    taxonomies = res2.hits.map((t) => ({ id: t.id, text: t.Name, code: t.Code__c }))
  }

  let trendingSearches: any[] = []
  if (settings?.enableTrendingSearches) {
    trendingSearches = await getTrendingSearches()
  }

  let relatedSearches: any[] = []
  if (settings?.enableRelatedSearches && searchText && userId) {
    relatedSearches = await getRelatedSearches(searchText, userId)
  }

  const suggestions = {
    programs: programs.map((p) => ({ ...p, group: 'Programs' })),
    taxonomies: taxonomies.map((t) => ({ ...t, group: 'Services' })),
    relatedSearches: relatedSearches.map((text, i) => ({ id: -(i + 1001), text, group: 'Related searches' })),
    trendingSearches: trendingSearches.map((text: any, i: number) => ({
      id: -(i + 1),
      text,
      group: 'Trending'
    }))
  }

  return suggestions
}
