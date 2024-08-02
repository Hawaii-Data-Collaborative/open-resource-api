import { filterableAttributes } from '../constants'
import meilisearch from '../lib/meilisearch'

async function main() {
  const index = meilisearch.index('site')
  const task = await index.updateFilterableAttributes(filterableAttributes.site)
  console.log('[meilisearchUpdateFilterableAttributes] task=%s', JSON.stringify(task))
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
