import { program as Program } from '@prisma/client'
import prisma from '../lib/prisma'
import { buildHours } from '../util'
import { Service } from './base'

const debug = require('debug')('app:services:program')

let categoryMap = {}

async function init() {
  debug('[init]')
  const psList = await prisma.program_service.findMany({
    select: { Program__c: true, Taxonomy__c: true }
  })

  const taxList = await prisma.taxonomy.findMany({
    select: { id: true, Name: true, Code__c: true },
    where: { Status__c: { not: 'Inactive' } }
  })

  categoryMap = {}
  for (const ps of psList) {
    if (!categoryMap[ps.Program__c]) {
      categoryMap[ps.Program__c] = []
    }
    const tax = taxList.find((t) => t.id === ps.Taxonomy__c)
    if (tax) {
      categoryMap[ps.Program__c].push({ value: tax.Code__c, label: tax.Name })
    }
  }

  debug('[init] added %s entries to categoryMap', Object.keys(categoryMap).length)
  const tenMinutes = 1000 * 60 * 10
  setTimeout(() => {
    init()
  }, tenMinutes)
}

init()

export class ProgramService extends Service {
  getCategories(program: Program) {
    const rv = categoryMap[program.id]
    // if (rv) {
    //   debug('[getCategories] found entry with %s categories for program %s', rv.length, program.id)
    // } else {
    //   debug('[getCategories] nothing found for program %s', program.id)
    // }
    return rv ?? []
  }

  getLanguages(program: Program) {
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
              .replace('and ', '')
          break
        default:
          languages = program.Languages_Consistently_Available__c
      }
    } else if (program.Languages_Text__c !== null) {
      languages = program.Languages_Text__c
    } else {
      languages = ''
    }

    return languages
  }

  getApplicationProcess(program: Program) {
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

    return applicationProcess
  }

  getFees(program: Program, normalize = false) {
    let fees: string
    if (normalize) {
      if (program.Fees__c === null || program.Fees__c === 'No fees') {
        fees = 'Free'
      } else if (program.Fees__c === 'Sliding Scale') {
        fees = 'Sliding scale'
      } else if (program.Fees_Other__c?.includes('per year')) {
        fees = 'Annual fee'
      } else if (program.Fees_Other__c?.includes('per month')) {
        fees = 'Monthly fee'
      } else if (program.Fees_Other__c?.includes('per week')) {
        fees = 'Weekly fee'
      } else if (program.Fees_Other__c?.includes('per day') || program.Fees_Other__c?.includes('per night')) {
        fees = 'Daily fee'
      } else if (program.Fees__c.includes('Flat Fee')) {
        fees = 'Flat fee'
      } else {
        fees = 'Other'
      }
    } else {
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
    }

    return fees
  }

  getSchedule(program: Program) {
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

    return schedule
  }

  getServiceArea(program: Program) {
    return program.ServiceArea__c == null
      ? null
      : program.ServiceArea__c.toLowerCase().includes('all islands')
      ? 'All islands'
      : program.ServiceArea__c.replaceAll(';', ', ')
  }

  getAgeRestrictions(program: Program) {
    let rv: string | null = null
    if (program.Age_Restrictions__c?.trim().startsWith('Yes')) {
      if (program.Maximum_Age__c === '211') {
        program.Maximum_Age__c = null
      }
      if (program.Minimum_Age__c != null && program.Maximum_Age__c != null) {
        rv = `${program.Minimum_Age__c}-${program.Maximum_Age__c}`
      } else if (program.Minimum_Age__c != null) {
        rv = `${program.Minimum_Age__c}+`
      } else if (program.Maximum_Age__c != null) {
        rv = `Under ${Number(program.Maximum_Age__c) + 1}`
      } else if (program.Age_Restriction_Other__c != null) rv = program.Age_Restriction_Other__c
    }
    return rv
  }
}
