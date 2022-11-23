import dayjs, { ManipulateType } from 'dayjs'
import db from '../lib/db'

// eslint-disable-next-line quotes
const CREATED_DATE_AS_INT = `cast(replace(substr("createdAt", 0, 11), '-', '') as integer)`
const MIN_COUNT = 3

export async function getTrendingSearches(range: ManipulateType = 'month') {
  const start = Number(dayjs().subtract(1, range).format('YYYYMMDD'))
  const query = `select * from "user_activity" where "event" = 'Search' and ${CREATED_DATE_AS_INT} >= ${start}`
  const rows = (await db.query(query)) as any[]
  const searchTextToCount: any = {}
  for (const row of rows) {
    try {
      row.data = JSON.parse(row.data as string)
      if (row.data.terms && !row.data.taxonomies) {
        const text = row.data.terms.toLowerCase().trim()
        if (!searchTextToCount[text]) {
          searchTextToCount[text] = 0
        }
        searchTextToCount[text]++
      }
    } catch (err) {
      // no op
    }
  }

  const rv = []
  for (const [text, count] of Object.entries(searchTextToCount)) {
    if ((count as number) >= MIN_COUNT) {
      rv.push(text)
    }
  }
  return rv
}
