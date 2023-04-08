import Router from '@koa/router'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'

import prisma from '../../lib/prisma'

const router = new Router({
  prefix: '/service-at-location'
})

router.get('/:id', async (ctx) => {
  // const serviceAtLocation = await prisma.service_at_location.findFirst({
  //   where: { id: ctx.params.id },
  //   include: {
  //     service: {
  //       include: {
  //         organization: true,
  //         eligibility: true,
  //         schedule: true,
  //       },
  //     },
  //     phone: {
  //       take: 1,
  //     },
  //     location: {
  //       include: {
  //         physical_address: {
  //           take: 1,
  //         },
  //         language: true,
  //       },
  //     },
  //   },
  // });

  // ctx.body = serviceAtLocation;

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

    const result: any = {
      id: siteProgram.id,
      title: `${program.Name} at ${site.Name}`,
      description: program.Service_Description__c,
      phone: program.Program_Phone__c || program.Program_Phone_Text__c,
      website: program.Website__c,
      languages: program.Languages__c,
      fees: program.Fees_Text__c,
      emergencyInfo: '',
      eligibility: program.Eligibility__c,
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

    // id: result.id
    // title: result.service.name + (result.location.name || result.organization.name)
    // locationName: `${result.location.physical_address[0].address_1}, ${result.location.physical_address[0].city}, ${result.location.physical_address[0].state_province} ${result.location.physical_address[0].postal_code}`
    // locationLat: result.location.latitude
    // locationLon: result.location.longitude
    // description: result.service.description || result.service.short_description || result.result.description
    // phone: result.phone[0].number
    // website: result.service.url || result.url
    // languages: result?.location?.language ?? result.language
    // fees: result.service.fees
    // emergencyInfo: result.service.emergency_info
    // eligibility: result?.service?.eligibility ?? result?.eligibility ?? []
    // email: result.service.email
    // schedule: result?.service?.schedule[0]?.description ?? result?.schedule[0]?.description
    // applicationProcess: result.service.application_process
    // organizationName: result.service.organization.name
    // organizationDescription: result.service.organization.description

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
