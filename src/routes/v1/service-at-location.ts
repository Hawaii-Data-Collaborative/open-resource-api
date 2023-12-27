import Router from '@koa/router'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import prisma from '../../lib/prisma'

const router = new Router({
  prefix: '/service-at-location'
})

router.get('/:id', async (ctx) => {
  try {
    const siteProgram = await prisma.site_program.findFirst({
      select: {
        id: true,
        Site__c: true,
        Program__c: true
      },
      where: { id: ctx.params.id },
      rejectOnNotFound: true
    })

    const site = await prisma.site.findFirst({
      where: {
        Status__c: { in: ['Active', 'Active - Online Only'] },
        id: siteProgram.Site__c as string
      },
      rejectOnNotFound: true
    })

    const program = await prisma.program.findFirst({
      where: {
        Status__c: { not: 'Inactive' },
        id: siteProgram.Program__c as string
      },
      rejectOnNotFound: true
    })

    const agency = await prisma.agency.findFirst({
      where: {
        Status__c: { in: ['Active', 'Active - Online Only'] },
        id: program.Account__c as string
      },
      rejectOnNotFound: true
    })

    const categories = []
    const psList = await prisma.program_service.findMany({
      select: { Taxonomy__c: true },
      where: { Program__c: program.id }
    })
    const taxIds = psList.map((ps) => ps.Taxonomy__c)
    const taxList = await prisma.taxonomy.findMany({
      select: { Name: true, Code__c: true },
      where: {
        id: { in: taxIds },
        Status__c: { not: 'Inactive' }
      }
    })
    for (const tax of taxList) {
      categories.push({ value: tax.Code__c, label: tax.Name })
    }

    const result: any = {
      id: siteProgram.id,
      title: `${program.Name} at ${site.Name}`,
      description: program.Service_Description__c,
      categories,
      phone: program.Program_Phone__c || program.Program_Phone_Text__c,
      website: program.Website__c,
      languages: program.Languages__c,
      fees: program.Fees_Text__c,
      emergencyInfo: '',
      eligibility: program.Eligibility_Long__c, // || program.Eligibility__c,
      email: program.Program_Email__c,
      schedule: program.Hours__c,
      applicationProcess: program.Intake_Procedure__c,
      organizationName: agency.Name,
      organizationDescription: agency.Overview__c,
      serviceArea:
        program.ServiceArea__c == null
          ? null
          : program.ServiceArea__c.toLowerCase().includes('all islands')
          ? 'All islands'
          : program.ServiceArea__c.replaceAll(';', ', ')
    }

    if (!site.Billing_Address_is_Confidential__c || site.Billing_Address_is_Confidential__c == '0') {
      let street = site.Street_Number__c
      if (street && site.City__c) {
        if (site.Suite__c) {
          street += ` ${site.Suite__c}`
        }
        let physicalAddress = street
        if (site.City__c) {
          physicalAddress += `, ${site.City__c}`
          if (site.State__c) {
            physicalAddress += ` ${site.State__c}`
            if (site.Zip_Code__c) {
              physicalAddress += ` ${site.Zip_Code__c}`
            }
          }
        }
        result.locationName = physicalAddress
      }

      if (site.Street_Number__c && site.Location__Latitude__s && site.Location__Longitude__s) {
        result.locationLat = site.Location__Latitude__s
        result.locationLon = site.Location__Longitude__s
      }
    }

    ctx.body = result
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError || (err as Error).name === 'NotFoundError') {
      ctx.body = null
    } else {
      throw err
    }
  }
})

export default router
