import prisma from '../lib/prisma'

export async function getCategories() {
  const categories = await prisma.category.findMany({ where: { active: true } })
  const parents: any[] = categories.filter((c) => !c.parentId)
  for (const parent of parents) {
    parent.children = categories.filter((c) => c.parentId === parent.id)
  }
  return parents
}
