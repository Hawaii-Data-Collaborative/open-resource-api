import prisma from '../lib/prisma'
import { searchService } from '.'

const debug = require('debug')('app:services:favorite')

export async function addFavorite(userId, siteProgramId) {
  const f = await prisma.favorite.create({
    data: {
      userId,
      siteProgramId,
      createdAt: new Date().toJSON(),
      updatedAt: new Date().toJSON()
    }
  })
  debug('[addFavorite] created favorite %s', f.id)
  return f
}

export async function removeFavorite(userId, id) {
  debug('[removeFavorite] userId=%s id=%s', userId, id)
  const { count } = await prisma.favorite.deleteMany({
    where: {
      siteProgramId: id,
      userId
    }
  })
  debug('[removeFavorite] deleted %s favorites', count)
  return count
}

export async function getFavorites(userId) {
  debug('[getFavorites] userId=%s', userId)
  const list = await prisma.favorite.findMany({ where: { userId } })
  const spIds = list.map((f) => f.siteProgramId)
  const spList = await prisma.site_program.findMany({ where: { id: { in: spIds } } })
  return searchService.buildResults(spList)
}

export async function getFavoriteSiteProgramIds(userId) {
  debug('[getFavoriteSiteProgramIds] userId=%s', userId)
  const list = await prisma.favorite.findMany({ select: { siteProgramId: true }, where: { userId } })
  const ids = list.map((f) => f.siteProgramId)
  return ids
}
