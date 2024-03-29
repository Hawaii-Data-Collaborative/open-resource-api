import prisma from '../../src/lib/prisma'
import { getRelatedSearches } from '../../src/services/trends'

test('getRelatedSearches()', async () => {
  const ua = await prisma.user_activity.findFirst({ rejectOnNotFound: true })
  const result = await getRelatedSearches('food', ua.userId)
  expect(result).toBeInstanceOf(Array)
})
