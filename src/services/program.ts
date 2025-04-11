import { program as Program, taxonomy as Taxonomy } from '@prisma/client'
import prisma from '../lib/prisma'
import { buildHours } from '../util'
import { Service } from './base'
import { LANGUAGES } from '../constants'
import { TaxonomyService } from './taxonomy'

const debug = require('debug')('app:services:program')

let categoryMap = {}

async function init() {
  debug('[init]')
  for (const lang of LANGUAGES) {
    const psList = await prisma.program_service.findMany({
      select: { Program__c: true, Taxonomy__c: true }
    })

    const taxList = await prisma.taxonomy.findMany({
      select: { id: true, Name: true, Code__c: true },
      where: { Status__c: { not: 'Inactive' } }
    })
    const taxonomyService = new TaxonomyService({ lang })
    await taxonomyService.translate(taxList as Taxonomy[])

    categoryMap[lang] = {}
    for (const ps of psList) {
      if (!categoryMap[lang][ps.Program__c]) {
        categoryMap[lang][ps.Program__c] = []
      }
      const tax = taxList.find((t) => t.id === ps.Taxonomy__c)
      if (tax) {
        categoryMap[lang][ps.Program__c].push({ value: tax.Code__c, label: tax.Name })
      }
    }

    debug('[init] added %s entries to categoryMap for lang %s', Object.keys(categoryMap[lang]).length, lang)
  }

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
    const t = this.t.bind(this)

    let languages: string
    const engLabel = t('English')
    if (program.Languages_Consistently_Available__c !== null) {
      switch (program.Languages_Consistently_Available__c) {
        case t('English Only'):
          languages = engLabel
          break
        case t('English and Other (Specify)'):
          languages =
            engLabel +
            ', ' +
            (program.Languages_Text__c as string)
              .replace(`${engLabel} ${t('and')} `, '')
              .replace(`${engLabel}, `, '')
              .replace(`${engLabel}; `, '')
              .replace(`${t('and')} `, '')
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
    const t = this.t.bind(this)

    let applicationProcess: string
    if (program.Intake_Procedure_Multiselect__c !== null) {
      const items = new Set(program.Intake_Procedure_Multiselect__c.split(';'))
      if (items.has(t('Other (specify)'))) {
        items.delete(t('Other (specify)'))
        items.add(program.Intake_Procedures_Other__c as string)
      }
      applicationProcess = [...items].join(', ')
    } else {
      applicationProcess = ''
    }

    return applicationProcess
  }

  getFees(program: Program, normalize = false) {
    const t = this.t.bind(this)

    let fees: string
    if (normalize) {
      if (program.Fees__c === null || program.Fees__c === t('No fees')) {
        fees = t('Free')
      } else if (program.Fees__c === t('Sliding Scale')) {
        fees = t('Sliding scale')
      } else if (program.Fees_Other__c?.includes(t('per year'))) {
        fees = t('Annual fee')
      } else if (program.Fees_Other__c?.includes(t('per month'))) {
        fees = t('Monthly fee')
      } else if (program.Fees_Other__c?.includes(t('per week'))) {
        fees = t('Weekly fee')
      } else if (program.Fees_Other__c?.includes(t('per day')) || program.Fees_Other__c?.includes(t('per night'))) {
        fees = t('Daily fee')
      } else if (program.Fees__c.includes(t('Flat Fee'))) {
        fees = t('Flat fee')
      } else {
        fees = t('Other')
      }
    } else {
      if (program.Fees__c) {
        let allFees = program.Fees__c.split(';')
        if (allFees.includes(t('Other'))) {
          allFees = allFees.filter((f) => f !== t('Other'))
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
    const t = this.t.bind(this)

    let schedule: string
    if (program.Open_247__c == '1') {
      schedule = t('Open 24/7')
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
        buildHours(t('Monday'), program.Open_Time_Monday__c, program.Close_Time_Monday__c, t),
        buildHours(t('Tuesday'), program.Open_Time_Tuesday__c, program.Close_Time_Tuesday__c, t),
        buildHours(t('Wednesday'), program.Open_Time_Wednesday__c, program.Close_Time_Wednesday__c, t),
        buildHours(t('Thursday'), program.Open_Time_Thursday__c, program.Close_Time_Thursday__c, t),
        buildHours(t('Friday'), program.Open_Time_Friday__c, program.Close_Time_Friday__c, t),
        buildHours(t('Saturday'), program.Open_Time_Saturday__c, program.Close_Time_Saturday__c, t),
        buildHours(t('Sunday'), program.Open_Time_Sunday__c, program.Close_Time_Sunday__c, t)
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
    const t = this.t.bind(this)

    return program.ServiceArea__c == null
      ? null
      : program.ServiceArea__c.toLowerCase().includes(t('all islands'))
      ? t('All islands')
      : program.ServiceArea__c.replaceAll(';', ', ')
  }

  getAgeRestrictions(program: Program) {
    const t = this.t.bind(this)

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
        rv = `${t('Under')} ${Number(program.Maximum_Age__c) + 1}`
      } else if (program.Age_Restriction_Other__c != null) rv = program.Age_Restriction_Other__c
    }
    return rv
  }

  async translate(programs: Program | Program[]) {
    const lang = this.lang
    if (lang === 'en') {
      return
    }
    if (!Array.isArray(programs)) {
      programs = [programs]
    }
    const programIds = programs.map((p) => p.id)
    const ptlist = await prisma.program_translation.findMany({
      where: { language: lang, programId: { in: programIds } }
    })
    const map: { [key: string]: Program } = {}
    for (const p of programs) {
      map[p.id] = p
    }
    for (const pt of ptlist) {
      map[pt.programId].Name = pt.name
      map[pt.programId].Age_Restrictions__c = pt.ageRestrictions
      map[pt.programId].Age_Restriction_Other__c = pt.ageRestrictionOther
      map[pt.programId].Eligibility_Long__c = pt.eligibilityLong
      map[pt.programId].Fees_Other__c = pt.feesOther
      map[pt.programId].Fees__c = pt.fees
      map[pt.programId].Intake_Procedure_Multiselect__c = pt.intakeProcedureMultiselect
      map[pt.programId].Intake_Procedures_Other__c = pt.intakeProceduresOther
      map[pt.programId].Languages_Consistently_Available__c = pt.languagesConsistentlyAvailable
      map[pt.programId].Languages_Text__c = pt.languagesText
      map[pt.programId].Maximum_Age__c = pt.maximumAge
      map[pt.programId].Minimum_Age__c = pt.minimumAge
      map[pt.programId].Program_Special_Notes_Hours__c = pt.programSpecialNotesHours
      map[pt.programId].Service_Description__c = pt.serviceDescription
    }
  }
}
