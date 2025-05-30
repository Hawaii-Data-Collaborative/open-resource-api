import prisma from '../lib/prisma'
import { Service } from './base'

export class BannerService extends Service {
  async getBanner() {
    const settings = await prisma.settings.findFirst({ where: { id: 1 } })
    return {
      text: settings?.bannerText,
      link: settings?.bannerLink
    }
  }
}
