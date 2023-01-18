import * as fs from 'fs/promises'
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

test('search() - searchTaxonomyIndex', async () => {
  const testCase = async (searchText: string) => {
    console.log('[testCase] searchText=%s', searchText)
    const results1 = await search({ searchText, searchTaxonomyIndex: true })
    const results2 = await search({ searchText, searchTaxonomyIndex: false })

    const fn = (o) => [o._source.location_name, o._source.service_name, o._source.service_short_description]
    const list1 = results1.map(fn)
    const list2 = results2.map(fn)
    const json1 = JSON.stringify(list1, null, 2)
    const json2 = JSON.stringify(list2, null, 2)
    await fs.writeFile(`./out1-${searchText}.json`, json1)
    await fs.writeFile(`./out2-${searchText}.json`, json2)
    expect(list1.length).toBeGreaterThanOrEqual(list2.length)
  }

  await testCase('allerg')
  await testCase('shelter')
  await testCase('domestic violence')
  await testCase('damestic vialence')
  await testCase('job interview')
  await testCase('work')
  await testCase('prison')
  await testCase('rehab')
})
