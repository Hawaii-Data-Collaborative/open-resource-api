import Router from '@koa/router';

import prisma from '../../lib/prisma';

const router = new Router({
  prefix: '/suggestion',
});

router.get('/', async (ctx) => {
  const suggestions = await prisma.suggestion.findMany();
  ctx.body = suggestions;
});

export default router;
