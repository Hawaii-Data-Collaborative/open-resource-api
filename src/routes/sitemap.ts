import Router from '@koa/router'
import nunjucks from 'nunjucks'
import { programService } from '../services'
import prisma from '../lib/prisma'
import { buildResults } from '../services/search'

const BASE_PREFIX = process.env.BASE_PREFIX || ''
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
    }, 1000 * 60 * 10)
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

  const html = nunjucks.render('program.html', { program })
  ctx.body = html
})

export default router
