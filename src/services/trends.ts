import _ from 'lodash'
import dayjs from '../lib/dayjs'
import db from '../lib/db'
import prisma from '../lib/prisma'

// eslint-disable-next-line quotes
const CREATED_DATE_AS_INT = `cast(replace(substr("createdAt", 0, 11), '-', '') as integer)`

export async function getTrendingSearches() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, rejectOnNotFound: true })
  const start = await getTrendStartDateAsInt(settings)
  const query = `select * from "user_activity" where "event" = 'Search.Keyword' and ${CREATED_DATE_AS_INT} >= ${start}`
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
    if (rv.length >= settings.trendingMaxShow) {
      break
    }
    if ((count as number) >= settings.trendingMinCount) {
      rv.push(text)
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
  return start
}

/**
 * Returns keywords that other users have searched for and have used in
 * their path to a referral.
 */
export async function getRelatedSearches(searchText: string, currentUserId: string) {
  const searchTimelines = await getSuccessfulSearchTimelines(searchText, currentUserId)
  const relatedSearches: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [userId, journeys] of Object.entries(searchTimelines)) {
    for (const journey of journeys as any[][]) {
      const skip = !journey.find((ua) => ua.data.terms === searchText)
      if (skip) continue

      let found = false
      for (const ua of journey) {
        if (found) {
          if (ua.event === 'Search.Keyword' && ua.data.terms) {
            if (!relatedSearches.includes(ua.data.terms)) {
              relatedSearches.push(ua.data.terms)
            }
          }
        } else if (ua.event === 'Search.Keyword' && ua.data.terms === searchText) {
          found = true
        }
      }
    }
  }

  return relatedSearches
}

/**
 * Returns successful searches – keyword searches that led to a referral – in the
 * shape of `Map<UserId, UserActivity[][]>`.
 *
 * The outer array contains an array of "journeys", which is one or more search
 * activities that ends in a referral activity.
 */
export async function getSuccessfulSearchTimelines(searchText: string, currentUserId: string) {
  searchText = searchText.toLowerCase()
  const uaListFull: any[] = await prisma.user_activity.findMany({
    where: {
      OR: [
        {
          event: 'Search.Keyword',
          userId: {
            not: currentUserId
          }
        },
        {
          event: { startsWith: 'Referral' },
          userId: {
            not: currentUserId
          }
        }
      ]
    },
    orderBy: { createdAt: 'asc' }
  })

  for (const ua of uaListFull) {
    ua.data = JSON.parse(ua.data as string)
    if (ua.data?.terms) {
      ua.data.terms = ua.data?.terms.trim().toLowerCase()
    }
    ua.createdAt = new Date(ua.createdAt)
  }

  const searchTimelines: any = {}
  const groups = _.groupBy(uaListFull, 'userId')
  // eslint-disable-next-line prefer-const
  for (let [userId, uaList] of Object.entries(groups)) {
    if (!userId) continue
    uaList = _.sortBy(uaList, 'createdAt')
    const journeys = []
    let journey = []
    let prevUa
    for (const ua of uaList) {
      journey.push(ua)

      if (ua.event.startsWith('Referral')) {
        // If we find a referral, store the current journey and start a new one.
        if (journey.length > 1) {
          journeys.push(journey)
        }
        journey = []
      } else if (prevUa) {
        // If 60 minutes have passed since the last activity, discard the current journey and start a new one.
        const minutes = dayjs.duration(ua.createdAt - prevUa.createdAt).asMinutes()
        if (minutes > 60) {
          journey = [ua]
        }
      }

      prevUa = ua
    }

    if (journeys.length) {
      searchTimelines[userId] = journeys
    }
  }

  return searchTimelines
}
