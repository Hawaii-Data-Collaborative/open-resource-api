import { searchableAttributes } from '../constants'
import meilisearch from '../lib/meilisearch'

async function main() {
  const index = meilisearch.index('program')
  const task2 = await index.updateSettings({ searchableAttributes: searchableAttributes.program })
  console.log('task = %s', JSON.stringify(task2))
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
