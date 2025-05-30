import { category as Category } from '@prisma/client'
import prisma from '../lib/prisma'
import { Service } from './base'

export class CategoryService extends Service {
  async getCategories() {
    const categories = await prisma.category.findMany({ where: { active: true } })
    await this.translate(categories)

    const parents: any[] = categories.filter((c) => !c.parentId)
    for (const parent of parents) {
      parent.children = categories.filter((c) => c.parentId === parent.id)
    }
    return parents
  }

  async translate(categories: Category | Category[]) {
    const lang = this.lang
    if (lang === 'en') {
      return
    }
    if (!Array.isArray(categories)) {
      categories = [categories]
    }
    const categoryIds = categories.map((c) => c.id)
    const ctlist = await prisma.category_translation.findMany({
      where: { language: lang, categoryId: { in: categoryIds } }
    })
    const map: { [key: string]: Category } = {}
    for (const c of categories) {
      map[c.id] = c
    }
    for (const ct of ctlist) {
      map[ct.categoryId].name = ct.name as string
    }
  }
}
