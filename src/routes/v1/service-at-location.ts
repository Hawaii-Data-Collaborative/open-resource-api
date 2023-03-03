import Router from '@koa/router'
import { site as Site } from '@prisma/client'

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

  const program = await prisma.program.findFirst({ where: { id: ctx.params.id }, rejectOnNotFound: true })
  const agency = await prisma.agency.findFirst({ where: { id: program.Account__c as string }, rejectOnNotFound: true })

  const result: any = {
    id: program.id,
    title: `${program.Name} at ${agency.Name}`,
    description: program.Service_Description__c,
    phone: program.Program_Phone__c,
    website: program.Website__c,
    languages: program.Languages__c,
    fees: program.Fees_Text__c,
    emergencyInfo: '',
    eligibility: program.Eligibility__c,
    email: program.Program_Email__c,
    schedule: program.Hours__c,
    applicationProcess: program.Intake_Procedure__c,
    organizationName: agency.Name,
    organizationDescription: agency.Description,
    serviceArea:
      program.ServiceArea__c == null
        ? null
        : program.ServiceArea__c.toLowerCase().includes('all islands')
        ? 'All islands'
        : program.ServiceArea__c.replaceAll(';', ', ')
  }

  const sitePrograms = await prisma.site_program.findMany({ where: { Program__c: program?.id } })
  const siteIds = sitePrograms.map((s) => s.Site__c as string)
  const sites = await prisma.site.findMany({ where: { id: { in: siteIds } } })
  const siteMap: any = {}
  for (const s of sites) {
    siteMap[s.id] = s
  }

  for (const sp of sitePrograms) {
    const site: Site = siteMap[sp.Site__c as string]
    if (site) {
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

      if (site.Location__Latitude__s && site.Location__Longitude__s) {
        result.locationLat = site.Location__Latitude__s
        result.locationLon = site.Location__Longitude__s
      }

      break
    }
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
})

export default router
