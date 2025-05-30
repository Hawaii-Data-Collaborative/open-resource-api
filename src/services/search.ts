import {
  agency as Agency,
  program as Program,
  taxonomy as Taxonomy,
  site as Site,
  site_program as SiteProgram
} from '@prisma/client'
import _ from 'lodash'
import { Context } from 'koa'
import { DateTime } from 'luxon'
import meilisearch from '../lib/meilisearch'
import prisma from '../lib/prisma'
import { TrendsService } from './trends'
import { filtersCache, resultsCache } from '../cache'
import { parseTimeString, wait } from '../util'
import { Service } from './base'
import { AgencyService } from './agency'
import { ProgramService } from './program'
import { SiteService } from './site'
import { TaxonomyService } from './taxonomy'

const debug = require('debug')('app:services:search')

const taxonomiesByLangByCode: any = {}
const taxonomiesByName: any = {}

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

export class SearchService extends Service {
  agencyService: AgencyService
  programService: ProgramService
  siteService: SiteService
  taxonomyService: TaxonomyService
  trendsService: TrendsService

  constructor(ctxOrService?: Context | Service) {
    super(ctxOrService)
    this.agencyService = new AgencyService(this)
    this.programService = new ProgramService(this)
    this.siteService = new SiteService(this)
    this.taxonomyService = new TaxonomyService(this)
    this.trendsService = new TrendsService(this)
  }

  async findProgramsByTaxonomyIds(taxIds: string[]) {
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

    await this.programService.translate(programs)

    return programs
  }

  filterResults(results: any[], facets: any, filters: any) {
    const t = this.t.bind(this)

    let filteredResults = results
    if (filters.openNow) {
      filteredResults = filteredResults.filter((r) => facets.openNow.includes(r.id))
    }

    const languages = Object.keys(filters)
      .filter((k) => k.startsWith(t('Language') + '.'))
      .map((k) => k.split('.')[1])

    if (languages.length) {
      filteredResults = filteredResults.filter((r) => {
        const tokens = r.languages.split(',').map((s) => s.trim())
        return languages.some((lang) => tokens.includes(lang))
      })
    }

    const ageRestrictions = Object.keys(filters)
      .filter((k) => k.startsWith(t('Age') + '.'))
      .map((k) => k.split('.')[1])

    if (ageRestrictions.length) {
      filteredResults = filteredResults.filter((r) => ageRestrictions.includes(r.ageRestrictions))
    }

    const costGroup = Object.keys(filters)
      .filter((k) => k.startsWith(t('Cost') + '.'))
      .map((k) => k.split('.')[1])

    if (costGroup.length) {
      filteredResults = filteredResults.filter((r) => costGroup.includes(r.fees))
    }

    return filteredResults
  }

  async search(input: SearchInput = {}, options: SearchOptions = {}) {
    const { searchText = '', taxonomies = '', zipCode = 0, radius = 0, lat = 0, lng = 0, filters = null } = input
    const { analyticsUserId, searchTaxonomyIndex = false } = options
    const lang = this.lang

    debug('[search] input=%j options=%j', input, options)

    const cacheKey = { ...input, lang, filters: undefined }
    const cachedResults = resultsCache.get(cacheKey)
    const cachedFilters = filtersCache.get(cacheKey)

    if (cachedResults) {
      if (_.isEmpty(filters)) {
        debug('[search] no filters, returning all results')
        return cachedResults
      } else if (cachedFilters) {
        debug('[search] yes filters, call filterResults')
        return this.filterResults(cachedResults, cachedFilters, filters)
      }
    }

    if (!taxonomiesByLangByCode[lang]) {
      debug('[search] populating taxonomiesByLangByCode')
      const arr = await prisma.taxonomy.findMany({ where: { Status__c: { not: 'Inactive' } } })
      await this.taxonomyService.translate(arr)
      taxonomiesByLangByCode[lang] = {}
      taxonomiesByName[lang] = {}
      for (const t of arr) {
        taxonomiesByLangByCode[lang][t.Code__c] = t
        taxonomiesByName[lang][t.Name] = t
      }
    }

    let programs: Program[] = []

    if (searchText) {
      if (taxonomiesByLangByCode[lang][searchText]) {
        const tid = (taxonomiesByLangByCode[lang][searchText] as Taxonomy).id
        debug('[search] found taxonomy in taxonomiesByLangByCode, searchText=%s tid=%s', searchText, tid)
        programs = await this.findProgramsByTaxonomyIds([tid])
        debug('[search] found %s programs for that taxonomy', programs.length)
      }

      if (!programs.length) {
        const programIndex = lang === 'en' ? 'program' : `program_${lang}`
        const res = await meilisearch
          .index(programIndex)
          .search(searchText, { attributesToRetrieve: ['id'], limit: 5000 })
        const ids = res.hits.map((h) => h.id)
        programs = await prisma.program.findMany({ where: { id: { in: ids }, Status__c: { not: 'Inactive' } } })
        await this.programService.translate(programs)
        debug('[search] main search found %s programs', programs.length)

        if (searchTaxonomyIndex) {
          const taxonomyIndex = lang === 'en' ? 'taxonomy' : `taxonomy_${lang}`
          const res2 = await meilisearch
            .index(taxonomyIndex)
            .search(searchText, { attributesToRetrieve: ['id'], limit: 5000 })
          const taxIds = res2.hits.map((t) => t.id)
          const programs2 = await this.findProgramsByTaxonomyIds(taxIds)
          debug('[search] found %s additional programs in taxonomy search', programs2.length)
          programs = _.uniqBy([...programs, ...programs2], 'id')
        }
      }
    } else {
      programs = await prisma.program.findMany({ where: { Status__c: { not: 'Inactive' } } })
      await this.programService.translate(programs)
      debug('[search] no search text, loaded all %s programs', programs.length)
    }

    let filteredPrograms: Program[] = []
    if (taxonomies) {
      debug('[search] processing taxonomies input')
      const taxonomyCodes = taxonomies.split(',').map((s) => s.trim())
      const filteredTaxonomies: Taxonomy[] = []
      for (const code of taxonomyCodes) {
        if (taxonomiesByLangByCode[lang][code]) {
          debug('[search] found code %s in taxonomiesByLangByCode', code)
          filteredTaxonomies.push(taxonomiesByLangByCode[lang][code])
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
            await this.taxonomyService.translate(taxList)
            filteredTaxonomies.push(...taxList)
          } else {
            debug('[search] code2 is empty')
          }
        }
      }

      const taxIds = filteredTaxonomies.map((t) => t.id)
      const tmp = await this.findProgramsByTaxonomyIds(taxIds)
      debug('[search] added %s programs to search results based on taxonomy search', tmp.length)
      filteredPrograms.push(...tmp)
    } else {
      filteredPrograms = programs
    }

    const programIds = filteredPrograms.map((p) => p.id)
    const where: any = { Program__c: { in: programIds } }

    let sites: Site[] | null = null
    let siteIds: string[] | null = null
    if (lat && lng) {
      const radiusMeters = radius * 1609.34
      const siteDocs = await meilisearch.index('site').search(null, {
        sort: [`_geoPoint(${lat}, ${lng}):asc`],
        filter: radius > 0 ? [`_geoRadius(${lat}, ${lng}, ${radiusMeters})`] : undefined,
        limit: 5000
      })
      sites = siteDocs.hits as Site[]
      await this.siteService.translate(sites)
      siteIds = sites.map((s) => s.id)
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

    let results

    if (sites) {
      results = []
      const agencyIds = _.compact(filteredPrograms.map((p) => p.Account__c))
      const agencies = await prisma.agency.findMany({
        where: { id: { in: agencyIds }, Status__c: { in: ['Active', 'Active - Online Only'] } }
      })
      await this.agencyService.translate(agencies)
      const agencyMap = {}
      for (const a of agencies) {
        agencyMap[a.id] = a
      }

      for (const site of sites) {
        const tmpSpList = sitePrograms.filter((sp) => sp.Site__c === site.id)
        // debug('[search] tmpSpList.length=%s', tmpSpList.length)
        for (const siteProgram of tmpSpList) {
          const tmpPrograms = filteredPrograms.filter((p) => p.id === siteProgram.Program__c)
          for (const program of tmpPrograms) {
            const agency = agencyMap[program.Account__c as string]
            if (agency) {
              const result = this._buildResult(siteProgram as SiteProgram, site, program, agency, true)
              results.push(result)
            }
          }
        }
      }
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

    if (!results) {
      results = await this.buildResults(sitePrograms as SiteProgram[], filteredPrograms)
    }

    resultsCache.set(cacheKey, results)

    if (_.isEmpty(filters)) {
      debug('[search] no filters, returning all results')
      return results
    } else {
      debug('[search] yes filters, get facets')
      await this.getFacets(input, options)
      const cachedFilters = filtersCache.get(cacheKey)
      if (cachedFilters) {
        debug('[search] yes facets, filter results')
        return this.filterResults(results, cachedFilters, filters)
      } else {
        debug('[search] no facets, returning all results')
        return results
      }
    }
  }

  async buildResults(sitePrograms: SiteProgram[], programs?: Program[]) {
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
    await this.siteService.translate(sites)
    const siteMap: any = {}
    for (const s of sites) {
      siteMap[s.id] = s
    }

    if (!programs) {
      const programIds = sitePrograms.map((sp) => sp.Program__c) as string[]
      programs = await prisma.program.findMany({ where: { id: { in: programIds }, Status__c: { not: 'Inactive' } } })
      await this.programService.translate(programs)
    }

    const agencyIds = _.compact(programs.map((p) => p.Account__c))
    const agencies = await prisma.agency.findMany({
      where: {
        id: { in: agencyIds }
      }
    })
    await this.agencyService.translate(agencies)
    const agencyMap: any = {}
    for (const a of agencies) {
      agencyMap[a.id] = a
    }

    const processedIds = new Set()

    for (const p of programs) {
      const agency: Agency = agencyMap[p.Account__c as string]
      if (!agency || !['Active', 'Active - Online Only'].includes(agency.Status__c as string)) {
        debug('[buildResults] skipping program %s, agency %s status=%s', p.Name, agency?.Name, agency?.Status__c)
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
          debug('[buildResults] sp.id %s in processedIds, skip', sp.id)
          continue
        }
        processedIds.add(sp.id)
        results.push(this._buildResult(sp, site, p, agency, true))
      }
    }

    return results
  }

  async getRecords(siteProgramIds) {
    const sitePrograms = await prisma.site_program.findMany({
      select: {
        id: true,
        Site__c: true,
        Program__c: true
      },
      where: { id: { in: siteProgramIds } }
    })

    const siteIds = sitePrograms.map((sp) => sp.Site__c as string)
    let sites = await prisma.site.findMany({
      where: {
        id: { in: siteIds }
      }
    })
    sites = sites.filter((s) => ['Active', 'Active - Online Only'].includes(s.Status__c as string))
    await this.siteService.translate(sites)

    const programIds = sitePrograms.map((sp) => sp.Program__c as string)
    let programs = await prisma.program.findMany({
      where: {
        id: { in: programIds }
      }
    })
    programs = programs.filter((p) => p.Status__c !== 'Inactive')
    await this.programService.translate(programs)

    const agencyIds = programs.map((p) => p.Account__c as string)
    let agencies = await prisma.agency.findMany({
      where: {
        id: { in: agencyIds }
      }
    })
    agencies = agencies.filter((a) => ['Active', 'Active - Online Only'].includes(a.Status__c as string))
    await this.agencyService.translate(agencies)

    const records = {}
    for (const siteProgram of sitePrograms) {
      const site = sites.find((s) => s.id === siteProgram.Site__c)
      const program = programs.find((p) => p.id === siteProgram.Program__c)
      const agency = program ? agencies.find((a) => a.id === program.Account__c) : null
      records[siteProgram.id] = { siteProgram, site, program, agency }
    }
    return records
  }

  _buildResult(siteProgram: SiteProgram, site: Site, program: Program, agency: Agency, normalize?: boolean) {
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
      ageRestrictions: this.programService.getAgeRestrictions(program),
      categories: this.programService.getCategories(program),
      languages: this.programService.getLanguages(program),
      fees: this.programService.getFees(program, normalize),
      schedule: this.programService.getSchedule(program),
      applicationProcess: this.programService.getApplicationProcess(program),
      serviceArea: this.programService.getServiceArea(program)
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
            physicalAddress += `, ${site.State__c}`
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
    }

    return result
  }

  buildResultSync(siteProgramId: string, meta = false, records: any) {
    const entry = records[siteProgramId]
    const { siteProgram, site, program, agency } = entry
    if (!(siteProgram && site && program && agency)) {
      return null
    }

    const result = this._buildResult(siteProgram, site, program, agency, true)

    if (meta) {
      result.meta = {
        site,
        program,
        siteProgram,
        agency
      }
    }

    return result
  }

  async buildResult(siteProgramId: string, meta = false) {
    const siteProgram = await prisma.site_program.findFirstOrThrow({
      select: {
        id: true,
        Site__c: true,
        Program__c: true
      },
      where: { id: siteProgramId }
    })

    const site = await prisma.site.findFirstOrThrow({
      where: {
        Status__c: { in: ['Active', 'Active - Online Only'] },
        id: siteProgram.Site__c as string
      }
    })
    await this.siteService.translate([site])

    const program = await prisma.program.findFirstOrThrow({
      where: {
        Status__c: { not: 'Inactive' },
        id: siteProgram.Program__c as string
      }
    })
    await this.programService.translate([program])

    const agency = await prisma.agency.findFirstOrThrow({
      where: {
        Status__c: { in: ['Active', 'Active - Online Only'] },
        id: program.Account__c as string
      }
    })
    await this.agencyService.translate([agency])

    const result = this._buildResult(siteProgram as SiteProgram, site, program, agency)

    if (meta) {
      result.meta = {
        site,
        program,
        siteProgram,
        agency
      }
    }

    return result
  }

  async instantSearch(searchText: string, userId: string) {
    const t = this.t.bind(this)

    const settings = await prisma.settings.findUnique({ where: { id: 1 } })

    const programIndex = this.lang === 'en' ? 'program' : `program_${this.lang}`
    const attributesToRetrieve = this.lang === 'en' ? ['id', 'Name'] : ['id', 'name']
    const res1 = await meilisearch.index(programIndex).search(searchText, { attributesToRetrieve, limit: 10 })
    const programs = res1.hits.map((p) => ({ id: p.id, text: p.Name ?? p.name }))

    let taxonomies: any[] = []
    if (settings?.enableTaxonomySearches) {
      const taxonomyIndex = this.lang === 'en' ? 'taxonomy' : `taxonomy_${this.lang}`
      const res2 = await meilisearch
        .index(taxonomyIndex)
        .search(searchText, { attributesToRetrieve: ['id'], limit: 10 })
      const ids = res2.hits.map((t) => t.id)
      const tmpTaxonomies = await prisma.taxonomy.findMany({ where: { id: { in: ids } } })
      await this.taxonomyService.translate(tmpTaxonomies)
      taxonomies = tmpTaxonomies.map((t) => ({ id: t.id, text: t.Name, code: t.Code__c }))
    }

    let trendingSearches: any[] = []
    if (settings?.enableTrendingSearches) {
      trendingSearches = await this.trendsService.getTrendingSearches()
    }

    let relatedSearches: any[] = []
    if (settings?.enableRelatedSearches && searchText && userId) {
      relatedSearches = await this.trendsService.getRelatedSearches(searchText, userId)
    }

    const suggestions = {
      programs: programs.map((p) => ({ ...p, group: t('Programs') })),
      taxonomies: taxonomies.map((tax) => ({ ...tax, group: t('Services') })),
      relatedSearches: relatedSearches.map((text, i) => ({ id: -(i + 1001), text, group: t('Related searches') })),
      trendingSearches: trendingSearches.map((text: any, i: number) => ({
        id: -(i + 1),
        text,
        group: t('Trending')
      }))
    }

    return suggestions
  }

  async getFacets(input: SearchInput = {}, options: SearchOptions = {}) {
    debug('[getFacets] input=%j options=%j', input, options)

    const t = this.t.bind(this)

    const lang = this.lang

    const cacheKey = { ...input, lang, filters: undefined }
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

      const siteProgramIds = cachedResults.map((r) => r.id)
      const records = await this.getRecords(siteProgramIds)
      const results: any[] = _.compact(cachedResults.map((r) => this.buildResultSync(r.id, true, records)))
      const facets: any = {
        openNow: [],
        groups: []
      }

      const languageGroup = { name: t('Language'), items: [] as any[] }
      if (results.some((r) => !!r.languages)) {
        facets.groups.push(languageGroup)
      }

      const ageGroup = { name: t('Age'), items: [] as any[] }
      if (results.some((r) => !!r.ageRestrictions)) {
        facets.groups.push(ageGroup)
      }

      const costGroup = { name: t('Cost'), items: [] as any[] }
      if (results.some((r) => !!r.fees)) {
        facets.groups.push(costGroup)
      }

      const now = DateTime.now().setZone('Pacific/Honolulu')
      const nowWeekday = now.weekday
      const nowTime = now.toFormat('HHmm')

      for (const result of results) {
        const program: Program = result?.meta?.program
        if (!program) {
          continue
        }

        // openNow facet

        if (program.Open_247__c === '1') {
          facets.openNow.push(result.id)
        } else {
          const allhours = [
            [program.Open_Time_Sunday__c, program.Close_Time_Sunday__c],
            [program.Open_Time_Monday__c, program.Close_Time_Monday__c],
            [program.Open_Time_Tuesday__c, program.Close_Time_Tuesday__c],
            [program.Open_Time_Wednesday__c, program.Close_Time_Wednesday__c],
            [program.Open_Time_Thursday__c, program.Close_Time_Thursday__c],
            [program.Open_Time_Friday__c, program.Close_Time_Friday__c],
            [program.Open_Time_Saturday__c, program.Close_Time_Saturday__c]
          ]

          const hours = allhours[nowWeekday - 1] as [string, string]
          const openTime = parseTimeString(hours[0])
          const closeTime = parseTimeString(hours[1])
          if (openTime && closeTime) {
            if (nowTime >= openTime && nowTime <= closeTime) {
              facets.openNow.push(result.id)
            }
          }
        }

        // languages facet

        if (result.languages) {
          const tokens = result.languages.split(',').map((s) => s.trim())
          for (const lang of tokens) {
            const item = languageGroup.items.find((i) => i.name === lang)
            if (item) {
              item.ids.push(result.id)
            } else {
              languageGroup.items.push({ name: lang, ids: [result.id] })
            }
          }
        }

        // age restrictions facet

        if (result.ageRestrictions) {
          const item = ageGroup.items.find((i) => i.name === result.ageRestrictions)
          if (item) {
            item.ids.push(result.id)
          } else {
            ageGroup.items.push({ name: result.ageRestrictions, ids: [result.id] })
          }
        }

        // cost facet

        if (result.fees) {
          const item = costGroup.items.find((i) => i.name === result.fees)
          if (item) {
            item.ids.push(result.id)
          } else {
            costGroup.items.push({ name: result.fees, ids: [result.id] })
          }
        }
      }

      languageGroup.items.sort((a, b) => {
        if (a.name.split(/\s+/).length > 2) {
          return 1
        }
        if (b.name.split(/\s+/).length > 2) {
          return -1
        }
        return a.name.localeCompare(b.name)
      })

      const minAgeRegex = /(\d+)\+/
      const maxAgeRegex = /Under (\d+)/
      const ageRangeRegex = /(\d+)-(\d+)/
      ageGroup.items.sort((a, b) => {
        let ax, bx, tmp

        if ((tmp = minAgeRegex.exec(a.name))) {
          ax = Number(tmp[1])
        } else if ((tmp = maxAgeRegex.exec(a.name))) {
          ax = Number(tmp[1])
        } else if ((tmp = ageRangeRegex.exec(a.name))) {
          ax = Number(tmp[1])
        }

        if ((tmp = minAgeRegex.exec(b.name))) {
          bx = Number(tmp[1])
        } else if ((tmp = maxAgeRegex.exec(b.name))) {
          bx = Number(tmp[1])
        } else if ((tmp = ageRangeRegex.exec(b.name))) {
          bx = Number(tmp[1])
        }

        if (Number.isFinite(ax) && Number.isFinite(bx)) {
          return ax - bx
        } else if (Number.isFinite(ax)) {
          return -1
        } else if (Number.isFinite(bx)) {
          return 1
        }

        return 0
      })

      costGroup.items.sort((a, b) => a.name.localeCompare(b.name))

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
}
