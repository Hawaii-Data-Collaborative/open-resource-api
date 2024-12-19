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
import { buildHours, timeStringToDate, wait } from '../util'

const debug = require('debug')('app:services:search')

let taxonomiesByCode: any
let taxonomiesByName: any

export async function findProgramsByTaxonomyIds(taxIds: string[]) {
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

interface SearchInput {
  searchText?: string
  taxonomies?: string
  zipCode?: number
  radius?: number
  lat?: number
  lng?: number
  filters?: any
}

interface SearchOptions {
  searchTaxonomyIndex?: boolean
  analyticsUserId?: string
}

function filterResults(results: any[], facets: any, filters: any) {
  let filteredResults = results
  if (filters.openNow) {
    filteredResults = filteredResults.filter((r) => facets.openNow.includes(r.id))
  }

  const languages = Object.keys(filters)
    .filter((k) => k.startsWith('Language.'))
    .map((k) => k.split('.')[1])

  if (languages.length) {
    filteredResults = filteredResults.filter((r) => {
      const tokens = r.languages.split(',').map((s) => s.trim())
      return languages.some((lang) => tokens.includes(lang))
    })
  }

  return filteredResults
}

export async function search(input: SearchInput = {}, options: SearchOptions = {}) {
  const { searchText = '', taxonomies = '', zipCode = 0, radius = 0, lat = 0, lng = 0, filters = null } = input
  const { analyticsUserId, searchTaxonomyIndex = false } = options

  debug('[search] input=%j options=%j', input, options)

  const cacheKey = { ...input, filters: undefined }
  const cachedResults = resultsCache.get(cacheKey)
  const cachedFilters = filtersCache.get(cacheKey)

  if (cachedResults) {
    if (_.isEmpty(filters)) {
      debug('[search] no filters, returning all results')
      return cachedResults
    } else if (cachedFilters) {
      debug('[search] yes filters, call filterResults')
      return filterResults(cachedResults, cachedFilters, filters)
    }
  }

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
      const res = await meilisearch.index('program').search(searchText, { limit: 5000 })
      programs = res.hits as Program[]
      debug('[search] main search found %s programs', programs.length)

      if (searchTaxonomyIndex) {
        const res2 = await meilisearch
          .index('taxonomy')
          .search(searchText, { attributesToRetrieve: ['id'], limit: 5000 })
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
  const where: any = { Program__c: { in: programIds } }

  let siteIds: string[] | null = null
  if (lat && lng) {
    const radiusMeters = radius * 1609.34
    const siteDocs = await meilisearch.index('site').search(null, {
      sort: [`_geoPoint(${lat}, ${lng}):asc`],
      filter: radius > 0 ? [`_geoRadius(${lat}, ${lng}, ${radiusMeters})`] : undefined,
      limit: 5000,
      attributesToRetrieve: ['id']
    })
    siteIds = siteDocs.hits.map((s) => s.id)
    debug('[search] geosearch found %s sites', siteIds.length)
  } else {
    debug('[search] not filtering by zipCode')
  }

  let tmpSitePrograms

  if (siteIds) {
    where.Site__c = { in: siteIds }

    if (analyticsUserId) {
      tmpSitePrograms = await prisma.site_program.findMany({
        select: { id: true, Site__c: true, Program__c: true },
        where: { Program__c: { in: programIds } }
      })
    }
  }

  const sitePrograms = await prisma.site_program.findMany({
    select: { id: true, Site__c: true, Program__c: true },
    where
  })

  debug(
    '[search] sitePrograms.length=%s programIds.length=%s siteIds.length=%s',
    sitePrograms.length,
    programIds.length,
    siteIds?.length
  )

  if (siteIds) {
    const filteredAndSortedPrograms: any[] = []
    for (const siteId of siteIds) {
      const filteredSitePrograms = sitePrograms.filter((sp) => sp.Site__c === siteId)
      for (const filteredSiteProgram of filteredSitePrograms) {
        const tmpFilteredPrograms = filteredPrograms.filter((p) => p.id === filteredSiteProgram.Program__c)
        filteredAndSortedPrograms.push(...tmpFilteredPrograms)
      }
    }
    filteredPrograms = filteredAndSortedPrograms
  }

  if (analyticsUserId) {
    if (tmpSitePrograms?.length && !sitePrograms.length) {
      const ua = await prisma.user_activity.create({
        data: {
          userId: analyticsUserId,
          event: 'UnmetNeeds.NoResultNearby',
          data: JSON.stringify({
            terms: searchText,
            taxonomies,
            zipCode,
            radius,
            lat,
            lng,
            totalCount: tmpSitePrograms.length
          }),
          createdAt: new Date().toJSON(),
          updatedAt: new Date().toJSON()
        }
      })
      debug('[search] created userActivity id=%s event=%s', ua.id, ua.event)
    } else if (!sitePrograms.length) {
      const ua = await prisma.user_activity.create({
        data: {
          userId: analyticsUserId,
          event: 'UnmetNeeds.NoResults',
          data: JSON.stringify({
            terms: searchText,
            taxonomies,
            zipCode,
            radius,
            lat,
            lng
          }),
          createdAt: new Date().toJSON(),
          updatedAt: new Date().toJSON()
        }
      })
      debug('[search] created userActivity id=%s event=%s', ua.id, ua.event)
    }
  }

  const results = await buildResults(sitePrograms as SiteProgram[], filteredPrograms)
  resultsCache.set(cacheKey, results)

  if (_.isEmpty(filters)) {
    debug('[search] no filters, returning all results')
    return results
  } else {
    debug('[search] yes filters, get facets')
    await getFacets(input, options)
    const cachedFilters = filtersCache.get(cacheKey)
    if (cachedFilters) {
      debug('[search] yes facets, filter results')
      return filterResults(results, cachedFilters, filters)
    } else {
      debug('[search] no facets, returning all results')
      return results
    }
  }
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

  const processedIds = new Set()

  for (const p of programs) {
    const agency: Agency = agencyMap[p.Account__c as string]
    if (!agency || !['Active', 'Active - Online Only'].includes(agency.Status__c as string)) {
      debug('[search] skipping program %s, agency %s status=%s', p.Name, agency?.Name, agency?.Status__c)
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

      if (processedIds.has(sp.id)) {
        debug('[search] sp.id %s in processedIds, skip', sp.id)
        continue
      }
      processedIds.add(sp.id)

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
        id: sp.id, //
        siteId: sp.Site__c,
        programId: sp.Program__c,
        active: p.Status__c === 'Active',
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
        website: p.Website__c, //
        categories: await getCategories(p),
        languages: getLanguages(p),
        fees: getFees(p),
        schedule: getSchedule(p),
        applicationProcess: getApplicationProcess(p),
        serviceArea: getServiceArea(p)
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

  const result: any = {
    id: siteProgram.id,
    title: `${program.Name} at ${site.Name}`,
    description: program.Service_Description__c,
    phone: program.Program_Phone_Text__c,
    website: program.Website__c,
    emergencyInfo: '',
    eligibility: program.Eligibility_Long__c,
    email: program.Program_Email__c,
    organizationName: agency.Name,
    organizationDescription: agency.Overview__c,
    categories: await getCategories(program),
    languages: getLanguages(program),
    fees: getFees(program),
    schedule: getSchedule(program),
    applicationProcess: getApplicationProcess(program),
    serviceArea: getServiceArea(program)
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

async function getCategories(program: Program) {
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

  return categories
}

function getLanguages(program: Program) {
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

  return languages
}

function getApplicationProcess(program: Program) {
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

  return applicationProcess
}

function getFees(program: Program) {
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

  return fees
}

function getSchedule(program: Program) {
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

  return schedule
}

function getServiceArea(program: Program) {
  return program.ServiceArea__c == null
    ? null
    : program.ServiceArea__c.toLowerCase().includes('all islands')
    ? 'All islands'
    : program.ServiceArea__c.replaceAll(';', ', ')
}

export async function instantSearch(searchText: string, userId: string) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })

  const res1 = await meilisearch
    .index('program')
    .search(searchText, { attributesToRetrieve: ['id', 'Name'], limit: 10 })
  const programs = res1.hits.map((p) => ({ id: p.id, text: p.Name }))

  let taxonomies: any[] = []
  if (settings?.enableTaxonomySearches) {
    const res2 = await meilisearch
      .index('taxonomy')
      .search(searchText, { attributesToRetrieve: ['id', 'Name', 'Code__c'], limit: 10 })
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

export async function getFacets(input: SearchInput = {}, options: SearchOptions = {}) {
  debug('[getFacets] input=%j options=%j', input, options)

  const cacheKey = { ...input, filters: undefined }
  let cachedFilters = filtersCache.get(cacheKey)

  if (!cachedFilters) {
    let cachedResults = resultsCache.get(cacheKey)
    let numRetries = 1
    while (!cachedResults) {
      if (numRetries < 3) {
        debug('[getFacets] sleep for 2s, numRetries=%s', numRetries)
        await wait(2000)
        cachedResults = resultsCache.get(cacheKey)
        if (cachedResults) {
          debug('[getFacets] got cachedResults after sleep, numRetries=%s', numRetries)
        } else {
          debug('[getFacets] still no cachedResults after sleep, numRetries=%s', numRetries)
        }
        numRetries++
      } else {
        debug('[getFacets] no luck, numRetries=%s', numRetries)
        return null
      }
    }

    debug('[getFacets] cachedResults.length=%s', cachedResults.length)

    const resultsPromise = cachedResults.map((r) => buildResult(r.id, true))
    const results = await Promise.all(resultsPromise)
    const facets: any = {
      openNow: [],
      groups: []
    }

    const languageGroup = { name: 'Language', items: [] as any[] }
    if (results.some((r) => !!r.languages)) {
      facets.groups.push(languageGroup)
    }

    for (const result of results) {
      const program: Program = result?.meta?.program
      if (!program) {
        continue
      }

      // openNow facet

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
          facets.openNow.push(result.id)
        }
      }

      // languages facet

      if (result.languages) {
        const tokens = result.languages.split(',').map((s) => s.trim())
        for (const lang of tokens) {
          let item = languageGroup.items.find((i) => i.name === lang)
          if (item) {
            item.ids.push(result.id)
          } else {
            languageGroup.items.push({ name: lang, ids: [result.id] })
          }
        }
      }
    }

    filtersCache.set(cacheKey, facets)

    cachedFilters = facets
  }

  const rv = {
    openNow: cachedFilters.openNow.length > 0,
    groups: cachedFilters.groups.map((g) => ({
      name: g.name,
      items: g.items.map((i) => ({
        name: i.name,
        count: i.ids.length
      }))
    }))
  }

  return rv
}
