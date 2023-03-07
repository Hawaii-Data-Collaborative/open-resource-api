import { searchableAttributes } from '../constants'
import meilisearch from '../lib/meilisearch'
import prisma from '../lib/prisma'
import stopWords from './stopWords.json'

async function processTaxonomies() {
  const taxonomies = await prisma.taxonomy.findMany()
  const index = meilisearch.index('taxonomy')
  await index.deleteAllDocuments()
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processTaxonomies] updateStopWords task = %s', JSON.stringify(task1))
  const task2 = await index.addDocuments(taxonomies)
  console.log('[processTaxonomies] addDocuments task = %s', JSON.stringify(task2))
}

async function processAgencies() {
  const agencies = await prisma.agency.findMany()
  const index = meilisearch.index('agency')
  await index.deleteAllDocuments()
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processAgencies] updateStopWords task = %s', JSON.stringify(task1))
  const task2 = await index.addDocuments(agencies)
  console.log('[processAgencies] addDocuments task = %s', JSON.stringify(task2))
}

async function processSites() {
  const sites = await prisma.site.findMany()
  for (const site of sites) {
    const tmp = site as any
    tmp._geo = {
      lat: site.Location__Latitude__s,
      lng: site.Location__Longitude__s
    }
  }
  const index = meilisearch.index('site')
  await index.deleteAllDocuments()
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processSites] updateStopWords task = %s', JSON.stringify(task1))
  const task2 = await index.addDocuments(sites)
  console.log('[processSites] addDocuments task = %s', JSON.stringify(task2))
}

async function processPrograms() {
  const programs = await prisma.program.findMany()
  const index = meilisearch.index('program')
  await index.deleteAllDocuments()
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processPrograms] updateStopWords task = %s', JSON.stringify(task1))
  const task2 = await index.updateSettings({ searchableAttributes: searchableAttributes.program })
  console.log('[processPrograms] updateSearchableAttributes task = %s', JSON.stringify(task2))
  const task3 = await index.addDocuments(programs)
  console.log('[processPrograms] addDocuments task = %s', JSON.stringify(task3))
}

async function processSitePrograms() {
  const sitePrograms = await prisma.site_program.findMany()
  const index = meilisearch.index('site_program')
  await index.deleteAllDocuments()
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processSitePrograms] updateStopWords task = %s', JSON.stringify(task1))
  const task2 = await index.addDocuments(sitePrograms)
  console.log('[processSitePrograms] addDocuments task = %s', JSON.stringify(task2))
}

async function main() {
  await processTaxonomies()
  await processAgencies()
  await processSites()
  await processPrograms()
  await processSitePrograms()
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
