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
import { filtersCache, resultsCache } from '../cache'
import { buildHours, timeStringToDate } from '../util'

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

  const results = await buildResults(sitePrograms as SiteProgram[], filteredPrograms)
  resultsCache.set({ searchText, taxonomies }, results)
  return results
}

export async function buildResults(sitePrograms: SiteProgram[], programs?: Program[]) {
  const results: any = []

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

  if (!programs) {
    const programIds = sitePrograms.map((sp) => sp.Program__c) as string[]
    programs = await prisma.program.findMany({ where: { id: { in: programIds } } })
  }

  const agencyIds = _.compact(programs.map((p) => p.Account__c))
  const agencies = await prisma.agency.findMany({
    where: {
      id: { in: agencyIds }
    }
  })
  const agencyMap: any = {}
  for (const a of agencies) {
    agencyMap[a.id] = a
  }

  for (const p of programs) {
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

export async function buildResult(siteProgramId: string, meta = false) {
  const siteProgram = await prisma.site_program.findFirst({
    select: {
      id: true,
      Site__c: true,
      Program__c: true
    },
    where: { id: siteProgramId },
    rejectOnNotFound: true
  })

  const site = await prisma.site.findFirst({
    where: {
      Status__c: { in: ['Active', 'Active - Online Only'] },
      id: siteProgram.Site__c as string
    },
    rejectOnNotFound: true
  })

  const program = await prisma.program.findFirst({
    where: {
      Status__c: { not: 'Inactive' },
      id: siteProgram.Program__c as string
    },
    rejectOnNotFound: true
  })

  const agency = await prisma.agency.findFirst({
    where: {
      Status__c: { in: ['Active', 'Active - Online Only'] },
      id: program.Account__c as string
    },
    rejectOnNotFound: true
  })

  const categories: any[] = []
  const psList = await prisma.program_service.findMany({
    select: { Taxonomy__c: true },
    where: { Program__c: program.id }
  })
  const taxIds = psList.map((ps) => ps.Taxonomy__c)
  const taxList = await prisma.taxonomy.findMany({
    select: { Name: true, Code__c: true },
    where: {
      id: { in: taxIds },
      Status__c: { not: 'Inactive' }
    }
  })
  for (const tax of taxList) {
    categories.push({ value: tax.Code__c, label: tax.Name })
  }

  let languages: string
  if (program.Languages_Consistently_Available__c !== null) {
    switch (program.Languages_Consistently_Available__c) {
      case 'English Only':
        languages = 'English'
        break
      case 'English and Other (Specify)':
        languages =
          'English, ' +
          (program.Languages_Text__c as string)
            .replace('English and ', '')
            .replace('English, ', '')
            .replace('English; ', '')
        break
      default:
        languages = program.Languages_Consistently_Available__c
    }
  } else if (program.Languages_Text__c !== null) {
    languages = program.Languages_Text__c
  } else {
    languages = ''
  }

  let applicationProcess: string
  if (program.Intake_Procedure_Multiselect__c !== null) {
    const items = new Set(program.Intake_Procedure_Multiselect__c.split(';'))
    if (items.has('Other (specify)')) {
      items.delete('Other (specify)')
      items.add(program.Intake_Procedures_Other__c as string)
    }
    applicationProcess = [...items].join(', ')
  } else {
    applicationProcess = ''
  }

  let fees: string
  if (program.Fees__c) {
    let allFees = program.Fees__c.split(';')
    if (allFees.includes('Other')) {
      allFees = allFees.filter((f) => f !== 'Other')
      if (program.Fees_Other__c) {
        allFees.push(program.Fees_Other__c)
      }
    }
    fees = allFees.map((f) => f.trim()).join('; ')
  } else {
    fees = ''
  }

  let schedule: string
  if (program.Open_247__c == '1') {
    schedule = 'Open 24/7'
  } else if (
    program.Open_Time_Monday__c ||
    program.Open_Time_Tuesday__c ||
    program.Open_Time_Wednesday__c ||
    program.Open_Time_Thursday__c ||
    program.Open_Time_Friday__c ||
    program.Open_Time_Saturday__c ||
    program.Open_Time_Sunday__c
  ) {
    schedule = [
      buildHours('Mo', program.Open_Time_Monday__c, program.Close_Time_Monday__c),
      buildHours('Tu', program.Open_Time_Tuesday__c, program.Close_Time_Tuesday__c),
      buildHours('We', program.Open_Time_Wednesday__c, program.Close_Time_Wednesday__c),
      buildHours('Th', program.Open_Time_Thursday__c, program.Close_Time_Thursday__c),
      buildHours('Fr', program.Open_Time_Friday__c, program.Close_Time_Friday__c),
      buildHours('Sa', program.Open_Time_Saturday__c, program.Close_Time_Saturday__c),
      buildHours('Su', program.Open_Time_Sunday__c, program.Close_Time_Sunday__c)
    ].join('\n')
  } else {
    schedule = ''
  }

  const result: any = {
    id: siteProgram.id,
    title: `${program.Name} at ${site.Name}`,
    description: program.Service_Description__c,
    categories,
    phone: program.Program_Phone_Text__c,
    website: program.Website__c,
    languages,
    fees,
    emergencyInfo: '',
    eligibility: program.Eligibility_Long__c,
    email: program.Program_Email__c,
    schedule,
    applicationProcess,
    organizationName: agency.Name,
    organizationDescription: agency.Overview__c,
    serviceArea:
      program.ServiceArea__c == null
        ? null
        : program.ServiceArea__c.toLowerCase().includes('all islands')
        ? 'All islands'
        : program.ServiceArea__c.replaceAll(';', ', ')
  }

  if (!site.Billing_Address_is_Confidential__c || site.Billing_Address_is_Confidential__c == '0') {
    let street = site.Street_Number__c
    if (street && site.City__c) {
      if (site.Suite__c) {
        street += ` ${site.Suite__c}`
      }
      let physicalAddress = street
      if (site.City__c) {
        physicalAddress += `, ${site.City__c}`
        if (site.State__c) {
          physicalAddress += ` ${site.State__c}`
          if (site.Zip_Code__c) {
            physicalAddress += ` ${site.Zip_Code__c}`
          }
        }
      }
      result.locationName = physicalAddress
    }

    if (site.Street_Number__c && site.Location__Latitude__s && site.Location__Longitude__s) {
      result.locationLat = site.Location__Latitude__s
      result.locationLon = site.Location__Longitude__s
    }

    if (meta) {
      result.meta = {
        site,
        program,
        siteProgram,
        agency
      }
    }
  }

  return result
}

export async function instantSearch(searchText: string, userId: string) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })

  const res1 = await meilisearch.index('program').search(searchText, { limit: 10 })
  const programs = _.uniqBy(
    res1.hits.map((p) => ({ id: p.id, text: p.Name })),
    'text'
  )

  let taxonomies: any[] = []
  if (settings?.enableTaxonomySearches) {
    const res2 = await meilisearch.index('taxonomy').search(searchText, { limit: 10 })
    taxonomies = _.uniqBy(
      res2.hits.map((t) => ({ id: t.id, text: t.Name, code: t.Code__c })),
      'text'
    )
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

export async function getFilters(searchText = '', taxonomies = '') {
  let value = filtersCache.get({ searchText, taxonomies })
  if (value) {
    return value
  }
  value = resultsCache.get({ searchText, taxonomies })
  if (!value) {
    return []
  }

  const resultsPromise = value.map((r) => buildResult(r._source.id, true))
  const results = await Promise.all(resultsPromise)
  const filters: any = {
    open: []
  }

  for (const result of results) {
    const program: Program = result.meta.program
    const allhours = [
      [program.Open_Time_Sunday__c, program.Close_Time_Sunday__c],
      [program.Open_Time_Monday__c, program.Close_Time_Monday__c],
      [program.Open_Time_Tuesday__c, program.Close_Time_Tuesday__c],
      [program.Open_Time_Wednesday__c, program.Close_Time_Wednesday__c],
      [program.Open_Time_Thursday__c, program.Close_Time_Thursday__c],
      [program.Open_Time_Friday__c, program.Close_Time_Friday__c],
      [program.Open_Time_Saturday__c, program.Close_Time_Saturday__c]
    ]
    const today = new Date().getDay()
    const hours = allhours[today] as [string, string]
    const [openTime, closeTime] = hours
    const open = timeStringToDate(openTime)
    const close = timeStringToDate(closeTime)
    if (open && close) {
      if (close < open) {
        close.setDate(close.getDate() + 1)
      }
      const now = new Date()
      if (now >= open && now <= close) {
        filters.open.push(result)
      }
    }
  }
}
