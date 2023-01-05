import Router from '@koa/router'
import prisma from '../../lib/prisma'

const router = new Router({
  prefix: '/categories'
})

router.get('/', async (ctx) => {
  const categories = await prisma.category.findMany({ where: { active: true } })
  const parents: any[] = categories.filter((c) => !c.parentId)
  for (const parent of parents) {
    parent.children = categories.filter((c) => c.parentId === parent.id)
  }
  ctx.body = parents
})

export default router
