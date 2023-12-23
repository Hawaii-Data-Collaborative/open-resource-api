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

export async function search({ searchText = '', taxonomies = '', searchTaxonomyIndex = false } = {}) {
  if (!taxonomiesByCode) {
    debug('[search] populating taxonomiesByCode')
    const arr = await prisma.taxonomy.findMany({ where: { Status__c: { not: 'Inactive' } } })
    taxonomiesByCode = {}
    taxonomiesByName = {}
    for (const t of arr) {
      taxonomiesByCode[t.Code__c as string] = t
      taxonomiesByName[t.Name as string] = t
    }
  }

  const results = []
  let programs: Program[] = []

  if (searchText) {
    if (taxonomiesByCode[searchText]) {
      const taxName = (taxonomiesByCode[searchText] as Taxonomy).Name
      debug('[search] search by taxonomy code, searchText=%s taxName=%s', searchText, taxName)

      programs = await prisma.program.findMany({
        where: {
          Status__c: { not: 'Inactive' },
          OR: [
            { Taxonomy_1__c: taxName },
            { Taxonomy_2__c: taxName },
            { Taxonomy_3__c: taxName },
            { Taxonomy_4__c: taxName },
            { Taxonomy_5__c: taxName },
            { Taxonomy_6__c: taxName },
            { Taxonomy_7__c: taxName },
            { Taxonomy_8__c: taxName },
            { Taxonomy_9__c: taxName },
            { Taxonomy_10__c: taxName }
          ]
        }
      })

      if (programs.length) {
        debug('[search] found %s programs', programs.length)
      } else {
        debug('[search] no results, fallback to regular search')
      }
    }

    if (!programs.length) {
      const res = await meilisearch.index('program').search(searchText, { limit: 500 })
      programs = res.hits as Program[]

      if (searchTaxonomyIndex) {
        const res2 = await meilisearch.index('taxonomy').search(searchText, { limit: 500 })
        const taxNames = res2.hits.map((t) => t.Name)
        const programs2 = await prisma.program.findMany({
          where: {
            Status__c: { not: 'Inactive' },
            OR: taxNames.map((taxName) => ({ Program_Taxonomies__c: { contains: taxName } }))
          }
        })

        programs = _.uniqBy([...programs, ...programs2], 'id')
      }
    }
  } else {
    programs = await prisma.program.findMany({ where: { Status__c: { not: 'Inactive' } } })
  }

  let filteredPrograms: Program[] = []
  if (taxonomies) {
    const taxonomyCodes = taxonomies.split(',').map((s) => s.trim())
    const filteredTaxonomies: Taxonomy[] = []
    for (const code of taxonomyCodes) {
      if (taxonomiesByCode[code]) {
        filteredTaxonomies.push(taxonomiesByCode[code])
      }
    }

    const taxonomiesByName2: any = {}
    for (const t of filteredTaxonomies) {
      taxonomiesByName2[t.Name as string] = t
    }

    for (const program of programs) {
      if (!program.Program_Taxonomies__c?.length) {
        continue
      }
      const progTaxList = program.Program_Taxonomies__c.split(';').map((s) => s.trim())

      for (const progTaxName of progTaxList) {
        if (taxonomiesByName2[progTaxName]) {
          filteredPrograms.push(program)
          break
        }
      }
    }
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
          phone: p.Program_Phone__c || p.Program_Phone_Text__c, //
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
