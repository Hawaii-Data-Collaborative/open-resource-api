import Router from '@koa/router'
import nunjucks from 'nunjucks'
import { programService } from '../services'
import prisma from '../lib/prisma'
import { buildResults } from '../services/search'

const BASE_PREFIX = process.env.BASE_PREFIX || ''
const router = new Router({
  prefix: `${BASE_PREFIX}/sitemap`
})

function isGooglebot(ctx) {
  return ctx.get('User-Agent').toLowerCase().includes('googlebot')
}

function applyBotInfo(ctx) {
  const isBot = isGooglebot(ctx)
  if (isBot) {
    ctx.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline'")
  }
}

router.get('/', async (ctx) => {
  const isBot = isGooglebot(ctx)
  const html = nunjucks.render('home.html', { redirect: isBot })
  applyBotInfo(ctx)
  ctx.body = html
})

router.get('/about', async (ctx) => {
  const isBot = isGooglebot(ctx)
  const html = nunjucks.render('about.html', { redirect: isBot })
  applyBotInfo(ctx)
  ctx.body = html
})

router.get('/programs', async (ctx) => {
  const programs = await prisma.program.findMany({ where: { Status__c: { not: 'Inactive' } } })
  const programIds = programs.map((p) => p.id)
  const sitePrograms = await prisma.site_program.findMany({
    select: { id: true, Site__c: true, Program__c: true },
    where: { Program__c: { in: programIds } }
  })
  const results = await buildResults(sitePrograms as any, programs)
  results.sort((a, b) => a.service_name.localeCompare(b.service_name))
  const isBot = isGooglebot(ctx)
  const html = nunjucks.render('programs.html', { redirect: isBot, programs: results })
  applyBotInfo(ctx)
  ctx.body = html
})

router.get('/programs/:id', async (ctx) => {
  let program
  try {
    program = await programService.getProgramDetails(ctx.params.id)
  } catch {
    program = null
  }

  const isBot = isGooglebot(ctx)
  const html = nunjucks.render('program.html', { redirect: isBot, program })
  applyBotInfo(ctx)
  ctx.body = html
})

export default router
