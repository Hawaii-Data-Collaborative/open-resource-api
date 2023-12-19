import meilisearch from '../src/lib/meilisearch'

test('meilisearch', async () => {
  const indexes = await meilisearch.getIndexes()
  const isHealthy = await meilisearch.isHealthy()
  const stats = await meilisearch.getStats()
  const tasks = await meilisearch.getTasks()
  expect(indexes).not.toBeNull()
  expect(isHealthy).toBe(true)
  expect(stats).not.toBeNull()
  expect(tasks).not.toBeNull()
})
