import querystring from 'querystring'
import Router from '@koa/router'
import nunjucks from 'nunjucks'
import { programService, searchService } from '../services'
import prisma from '../lib/prisma'
import { buildResults } from '../services/search'

const BASE_PREFIX = process.env.BASE_PREFIX || ''
const CACHE_TIME = 1000 * 60 * 10
const router = new Router({
  prefix: `${BASE_PREFIX}/sitemap`
})

router.get('/', async (ctx) => {
  const html = nunjucks.render('home.html')
  ctx.body = html
})

router.get('/about', async (ctx) => {
  const html = nunjucks.render('about.html')
  ctx.body = html
})

let cachedPrograms
router.get('/programs', async (ctx) => {
  if (!cachedPrograms) {
    const programs = await prisma.program.findMany({ where: { Status__c: { not: 'Inactive' } } })
    const programIds = programs.map((p) => p.id)
    const sitePrograms = await prisma.site_program.findMany({
      select: { id: true, Site__c: true, Program__c: true },
      where: { Program__c: { in: programIds } }
    })
    cachedPrograms = await buildResults(sitePrograms as any, programs)
    cachedPrograms.sort((a, b) => a.service_name.localeCompare(b.service_name))
    setTimeout(() => {
      cachedPrograms = null
    }, CACHE_TIME)
  }
  const html = nunjucks.render('programs.html', { programs: cachedPrograms })
  ctx.body = html
})

router.get('/programs/:id', async (ctx) => {
  let program
  try {
    program = await programService.getProgramDetails(ctx.params.id)
  } catch {
    program = null
  }

  const html = nunjucks.render('program.html', { program, redirect: process.env.NODE_ENV === 'production' })
  ctx.body = html
})

router.get('/categories', async (ctx) => {
  const categories = await prisma.category.findMany({ where: { active: true } })
  const parents = categories.filter((c) => !c.parentId)
  const rv: any[] = []
  for (const parent of parents) {
    const children = categories.filter((c) => c.parentId === parent.id)
    rv.push({ name: parent.name, subCategories: children.map((c) => ({ id: c.id, name: c.name })) })
  }

  const html = nunjucks.render('categories.html', { categories: rv })
  ctx.body = html
})

router.get('/categories/:id', async (ctx) => {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: Number(ctx.params.id as string) } })
  const allCodes = (querystring.parse(category.params as string).taxonomies as string).split(',')
  const exactCodes = allCodes.filter((c) => !c.endsWith('*'))
  const starCodes = allCodes.filter((c) => c.endsWith('*')).map((c) => c.replace('*', ''))
  const taxonomies: { id: string; Name: string; Code__c: string }[] = []
  if (exactCodes.length) {
    const tmp = await prisma.taxonomy.findMany({
      select: { id: true, Name: true, Code__c: true },
      where: { Code__c: { in: exactCodes } }
    })
    taxonomies.push(...tmp)
  }
  if (starCodes.length) {
    const tmp = await prisma.taxonomy.findMany({
      select: { id: true, Name: true, Code__c: true },
      where: { OR: starCodes.map((c) => ({ Code__c: { startsWith: c } })) }
    })
    taxonomies.push(...tmp)
  }

  const programs = await searchService.findProgramsByTaxonomyIds(taxonomies.map((t) => t.id))
  const programIds = programs.map((p) => p.id)
  const sitePrograms = await prisma.site_program.findMany({
    select: { id: true, Site__c: true, Program__c: true },
    where: { Program__c: { in: programIds } }
  })
  const searchResults = await buildResults(sitePrograms as any, programs)
  searchResults.sort((a, b) => a.service_name.localeCompare(b.service_name))
  const html = nunjucks.render('category.html', {
    category: category.name,
    programs: searchResults,
    taxonomies: taxonomies
  })
  ctx.body = html
})

router.get('/taxonomies', async (ctx) => {
  const pageSize = 100
  let limit = Math.min(Number((ctx.query.limit as string) ?? String(pageSize)), pageSize)
  let offset = Number((ctx.query.offset as string) ?? '0')
  if (isNaN(limit)) limit = pageSize
  if (isNaN(offset)) offset = 0
  const sort = (ctx.query.sort as string) ?? 'Name'

  const taxonomies = await prisma.taxonomy.findMany({
    select: { id: true, Name: true, Code__c: true, Definition__c: true },
    where: { IsDeleted: '0' },
    orderBy: { [sort.replace('-', '')]: sort.startsWith('-') ? 'desc' : 'asc' },
    take: limit,
    skip: offset
  })

  for (const t of taxonomies) {
    const programs = await searchService.findProgramsByTaxonomyIds([t.id])
    let programCount = 0
    if (programs.length) {
      const spList = await prisma.site_program.findMany({
        select: { Site__c: true },
        where: { Program__c: { in: programs.map((p) => p.id) } }
      })
      const siteIds = spList.map((sp) => sp.Site__c as string)
      const sites = await prisma.site.findMany({
        where: {
          Status__c: { in: ['Active', 'Active - Online Only'] },
          id: {
            in: siteIds
          }
        }
      })

      programCount = sites.length
    }

    // @ts-expect-error
    t.programCount = programCount
  }

  const pagination = {
    prev: offset > 0 ? querystring.stringify({ limit: limit, offset: offset - pageSize, sort }) : '',
    next: taxonomies.length > 0 ? querystring.stringify({ limit: limit, offset: offset + pageSize, sort }) : '',
    columns: {
      name: querystring.stringify({ sort: sort === 'Name' ? '-Name' : 'Name' }),
      code: querystring.stringify({ sort: sort === 'Code__c' ? '-Code__c' : 'Code__c' })
    },
    sort: {
      name: sort === 'Name' ? '↑' : sort === '-Name' ? '↓' : '',
      code: sort === 'Code__c' ? '↑' : sort === '-Code__c' ? '↓' : ''
    }
  }

  const html = nunjucks.render('taxonomies.html', { taxonomies: taxonomies, pagination, sort })
  ctx.body = html
})

router.get('/taxonomies/:id', async (ctx) => {
  const id = ctx.params.id as string
  const taxonomy = await prisma.taxonomy.findUniqueOrThrow({ where: { id } })
  const programs = await searchService.findProgramsByTaxonomyIds([id])
  const programIds = programs.map((p) => p.id)
  const sitePrograms = await prisma.site_program.findMany({
    select: { id: true, Site__c: true, Program__c: true },
    where: { Program__c: { in: programIds } }
  })
  const searchResults = await buildResults(sitePrograms as any, programs)
  searchResults.sort((a, b) => a.service_name.localeCompare(b.service_name))
  const html = nunjucks.render('taxonomy.html', { taxonomy, programs: searchResults })
  ctx.body = html
})

let cachedSearches: any[]
router.get('/searches', async (ctx) => {
  if (!cachedSearches) {
    const rows = await prisma.$queryRaw<{ term: string; count: number }[]>`
      select json_extract(data, '$.terms') as term, count(*) AS count
      from user_activity
      where json_extract(data, '$.terms') is not null
      group by term
      order by count desc
      limit 25
    `

    cachedSearches = rows.map((r) => ({ label: r.term, url: encodeURIComponent(r.term) }))

    setTimeout(() => {
      cachedPrograms = null
    }, CACHE_TIME)
  }
  const html = nunjucks.render('searches.html', { searches: cachedSearches })
  ctx.body = html
})

export default router
