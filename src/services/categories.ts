import prisma from '../lib/prisma'
import { Service } from './base'

export class CategoryService extends Service {
  async getCategories() {
    const categories = await prisma.category.findMany({ where: { active: true } })
    if (this.lang !== 'en') {
      const categoryIds = categories.map((c) => c.id)
      const tlist = await prisma.category_translation.findMany({
        where: {
          language: this.lang,
          categoryId: { in: categoryIds }
        }
      })
      const tmap = {}
      for (const t of tlist) {
        tmap[t.categoryId] = t
      }
      for (const c of categories) {
        const t = tmap[c.id]
        if (t) {
          c.name = t.name
        }
      }
    }
    const parents: any[] = categories.filter((c) => !c.parentId)
    for (const parent of parents) {
      parent.children = categories.filter((c) => c.parentId === parent.id)
    }
    return parents
  }
}
