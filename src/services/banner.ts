import prisma from '../lib/prisma'

export async function getBanner() {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  return {
    text: settings?.bannerText,
    link: settings?.bannerLink
  }
}
