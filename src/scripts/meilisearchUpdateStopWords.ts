import meilisearch from '../lib/meilisearch'
import stopWords from './stopWords.json'

async function processTaxonomies() {
  const index = meilisearch.index('taxonomy')
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processTaxonomies] updateStopWords task = %s', JSON.stringify(task1))
}

async function processAgencies() {
  const index = meilisearch.index('agency')
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processAgencies] updateStopWords task = %s', JSON.stringify(task1))
}

async function processSites() {
  const index = meilisearch.index('site')
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processSites] updateStopWords task = %s', JSON.stringify(task1))
}

async function processPrograms() {
  const index = meilisearch.index('program')
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processPrograms] updateStopWords task = %s', JSON.stringify(task1))
}

async function processSitePrograms() {
  const index = meilisearch.index('site_program')
  const task1 = await index.updateStopWords(stopWords.en)
  console.log('[processSitePrograms] updateStopWords task = %s', JSON.stringify(task1))
}

async function main() {
  await processTaxonomies()
  await processAgencies()
  await processSites()
  await processPrograms()
  await processSitePrograms()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
