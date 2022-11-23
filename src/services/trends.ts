import dayjs, { ManipulateType } from 'dayjs'
import db from '../lib/db'

// eslint-disable-next-line quotes
const CREATED_DATE_AS_INT = `cast(replace(substr("createdAt", 0, 11), '-', '') as integer)`

export async function getTrendingSearches(range: ManipulateType = 'month') {
  const start = Number(dayjs().subtract(1, range).format('YYYYMMDD'))
  const query = `select * from "user_activity" where "event" = 'Search' and ${CREATED_DATE_AS_INT} >= ${start}`
  const rows = (await db.query(query)) as any[]
  const searches = new Set()
  for (const row of rows) {
    try {
      row.data = JSON.parse(row.data as string)
      if (row.data.terms && !row.data.taxonomies) {
        searches.add(row.data.terms.toLowerCase().trim())
      }
    } catch (err) {
      // no op
    }
  }

  return [...searches]
}
