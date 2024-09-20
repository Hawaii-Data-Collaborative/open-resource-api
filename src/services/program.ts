import prisma from '../lib/prisma'
import { buildHours } from '../util'

const debug = require('debug')('app:services:program')

export async function getProgramDetails(spId: string) {
  const siteProgram = await prisma.site_program.findFirst({
    select: {
      id: true,
      Site__c: true,
      Program__c: true
    },
    where: { id: spId },
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

  const categories: any[] = []
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

  let languages: string
  if (program.Languages_Consistently_Available__c !== null) {
    switch (program.Languages_Consistently_Available__c) {
      case 'English Only':
        languages = 'English'
        break
      case 'English and Other (Specify)':
        languages =
          'English, ' +
          (program.Languages_Text__c as string)
            .replace('English and ', '')
            .replace('English, ', '')
            .replace('English; ', '')
        break
      default:
        languages = program.Languages_Consistently_Available__c
    }
  } else if (program.Languages_Text__c !== null) {
    languages = program.Languages_Text__c
  } else {
    languages = ''
  }

  let applicationProcess: string
  if (program.Intake_Procedure_Multiselect__c !== null) {
    const items = new Set(program.Intake_Procedure_Multiselect__c.split(';'))
    if (items.has('Other (specify)')) {
      items.delete('Other (specify)')
      items.add(program.Intake_Procedures_Other__c as string)
    }
    applicationProcess = [...items].join(', ')
  } else {
    applicationProcess = ''
  }

  let fees: string
  if (program.Fees__c) {
    let allFees = program.Fees__c.split(';')
    if (allFees.includes('Other')) {
      allFees = allFees.filter((f) => f !== 'Other')
      if (program.Fees_Other__c) {
        allFees.push(program.Fees_Other__c)
      }
    }
    fees = allFees.map((f) => f.trim()).join('; ')
  } else {
    fees = ''
  }

  let schedule: string
  if (program.Open_247__c == '1') {
    schedule = 'Open 24/7'
  } else if (
    program.Open_Time_Monday__c ||
    program.Open_Time_Tuesday__c ||
    program.Open_Time_Wednesday__c ||
    program.Open_Time_Thursday__c ||
    program.Open_Time_Friday__c ||
    program.Open_Time_Saturday__c ||
    program.Open_Time_Sunday__c
  ) {
    schedule = [
      buildHours('Monday', program.Open_Time_Monday__c, program.Close_Time_Monday__c),
      buildHours('Tuesday', program.Open_Time_Tuesday__c, program.Close_Time_Tuesday__c),
      buildHours('Wednesday', program.Open_Time_Wednesday__c, program.Close_Time_Wednesday__c),
      buildHours('Thursday', program.Open_Time_Thursday__c, program.Close_Time_Thursday__c),
      buildHours('Friday', program.Open_Time_Friday__c, program.Close_Time_Friday__c),
      buildHours('Saturday', program.Open_Time_Saturday__c, program.Close_Time_Saturday__c),
      buildHours('Sunday', program.Open_Time_Sunday__c, program.Close_Time_Sunday__c)
    ].join('\n')

    if (program.Program_Special_Notes_Hours__c) {
      schedule += `<div style="padding-top: 22px">${program.Program_Special_Notes_Hours__c}</div>`
    }
  } else {
    schedule = ''
  }

  const result: any = {
    id: siteProgram.id,
    title: `${program.Name} at ${site.Name}`,
    description: program.Service_Description__c,
    categories,
    phone: program.Program_Phone_Text__c,
    website: program.Website__c,
    languages,
    fees,
    emergencyInfo: '',
    eligibility: program.Eligibility_Long__c,
    email: program.Program_Email__c,
    schedule,
    applicationProcess,
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

  return result
}
