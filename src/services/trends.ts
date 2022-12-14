import dayjs from 'dayjs'
import db from '../lib/db'
import prisma from '../lib/prisma'

// eslint-disable-next-line quotes
const CREATED_DATE_AS_INT = `cast(replace(substr("createdAt", 0, 11), '-', '') as integer)`

export async function getTrendingSearches() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, rejectOnNotFound: true })
  console.log('[getTrendingSearches] settings=%s', settings)
  const start = await getTrendStartDateAsInt(settings)
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
    if ((count as number) >= settings.trendingMinCount) {
      rv.push(text)
    }
    if (rv.length > settings.trendingMaxShow) {
      break
    }
  }
  return rv
}

async function getTrendStartDateAsInt(settings: any) {
  let unit = settings.trendingRange || 'month'
  let value = 1
  if (unit === 'quarter') {
    unit = 'month'
    value = 3
  }
  const start = Number(dayjs().subtract(value, unit).format('YYYYMMDD'))
  console.log('[getTrendStartDateAsInt] start=%s', start)
  return start
}
