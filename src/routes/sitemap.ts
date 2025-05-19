import querystring from 'querystring'
import Router from '@koa/router'
import nunjucks from 'nunjucks'
import { searchService } from '../services'
import prisma from '../lib/prisma'
import { buildResults } from '../services/search'

const BASE_PREFIX = process.env.BASE_PREFIX || ''
const PAGE_SIZE = 100
const CACHE_TIME = 1000 * 60 * 10

function getPaginationInfo(ctx) {
  let limit = Math.min(Number((ctx.query.limit as string) ?? String(PAGE_SIZE)), PAGE_SIZE)
  let offset = Number((ctx.query.offset as string) ?? '0')
  if (isNaN(limit)) limit = PAGE_SIZE
  if (isNaN(offset)) offset = 0
  return { limit, offset }
}

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

let cachedPrograms: any[]
router.get('/programs', async (ctx) => {
  const { limit, offset } = getPaginationInfo(ctx)
  const sort = (ctx.query.sort as string) ?? 'title'

  if (!cachedPrograms) {
    const programs = await prisma.program.findMany({ where: { Status__c: { not: 'Inactive' } } })
    const programIds = programs.map((p) => p.id)
    const sitePrograms = await prisma.site_program.findMany({
      select: { id: true, Site__c: true, Program__c: true },
      where: { Program__c: { in: programIds } }
    })
    cachedPrograms = await buildResults(sitePrograms as any, programs)

    setTimeout(() => {
      // @ts-expect-error it's fine
      cachedPrograms = null
    }, CACHE_TIME)
  }

  const sortField = sort.replace('-', '')
  cachedPrograms.sort((a, b) =>
    sort.startsWith('-')
      ? (b[sortField] ?? '').localeCompare(a[sortField])
      : (a[sortField] ?? '').localeCompare(b[sortField])
  )

  const page = cachedPrograms.slice(offset, offset + PAGE_SIZE)

  // prettier-ignore
  const pagination = {
    prev: offset > 0 ? querystring.stringify({ limit: limit, offset: offset - PAGE_SIZE, sort }) : '',
    next: page.length > 0 ? querystring.stringify({ limit: limit, offset: offset + PAGE_SIZE, sort }) : '',
    columns: {
      title: querystring.stringify({ sort: sort === 'title' ? '-title' : 'title' }),
      locationName: querystring.stringify({ sort: sort === 'locationName' ? '-locationName' : 'locationName' }),
      description: querystring.stringify({ sort: sort === 'description' ? '-description' : 'service_short_description' }),
      phone: querystring.stringify({ sort: sort === 'phone' ? '-phone' : 'phone' }),
      website: querystring.stringify({ sort: sort === 'website' ? '-website' : 'website' }),
    },
    sort: {
      title: sort === 'title' ? '↑' : sort === '-title' ? '↓' : '',
      locationName: sort === 'locationName' ? '↑' : sort === '-locationName' ? '↓' : '',
      description: sort === 'description' ? '↑' : sort === '-description' ? '↓' : '',
      phone: sort === 'phone' ? '↑' : sort === '-phone' ? '↓' : '',
      website: sort === 'website' ? '↑' : sort === '-website' ? '↓' : ''
    }
  }

  const html = nunjucks.render('programs.html', { programs: page, pagination })
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
  searchResults.sort((a, b) => a.title.localeCompare(b.title))
  const html = nunjucks.render('category.html', {
    category: category.name,
    programs: searchResults,
    taxonomies: taxonomies
  })
  ctx.body = html
})

router.get('/taxonomies', async (ctx) => {
  const { limit, offset } = getPaginationInfo(ctx)
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

    // @ts-expect-error it's fine
    t.programCount = programCount
  }

  const pagination = {
    prev: offset > 0 ? querystring.stringify({ limit: limit, offset: offset - PAGE_SIZE, sort }) : '',
    next: taxonomies.length > 0 ? querystring.stringify({ limit: limit, offset: offset + PAGE_SIZE, sort }) : '',
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
  searchResults.sort((a, b) => a.title.localeCompare(b.title))
  const html = nunjucks.render('taxonomy.html', { taxonomy, programs: searchResults })
  ctx.body = html
})

let cachedSearches: any[]
router.get('/searches', async (ctx) => {
  if (!cachedSearches) {
    const rows = await prisma.$queryRaw<{ term: string; count: number }[]>`
      select data->>'terms' as term, count(*) AS count
      from user_activity
      where data->>'terms' is not null
      group by term
      order by count desc
      limit 25
    `

    cachedSearches = rows.map((r) => ({ label: r.term, url: encodeURIComponent(r.term) }))

    setTimeout(() => {
      // @ts-expect-error it's fine
      cachedSearches = null
    }, CACHE_TIME)
  }
  const html = nunjucks.render('searches.html', { searches: cachedSearches })
  ctx.body = html
})

export default router
