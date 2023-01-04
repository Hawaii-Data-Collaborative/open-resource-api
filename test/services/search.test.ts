import { search } from '../../src/services/search'

test('search() - "i need food"', async () => {
  const results = await search({ searchText: 'i need food' })
  for (const result of results) {
    const str = JSON.stringify(result).toLowerCase()
    if (str.includes('need')) {
      expect(str.includes('food')).toBe(true)
    }
  }
})

test('search() - taxonomy text', async () => {
  const results = await search({ searchText: 'allerg' })
  expect(results).toMatchSnapshot()
})

test('search() - taxonomy', async () => {
  const results = await search({ taxonomies: 'LV-0500.0500' })
  expect(results).toMatchSnapshot()
})
