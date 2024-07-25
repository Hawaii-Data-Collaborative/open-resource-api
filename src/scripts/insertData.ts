/**
 * This script does five things:
 * 1. Creates a backup of the database.
 * 2. Deletes all rows from the tables being processed by this script.
 * 3. Reads the raw data from the ./data/json folder.
 * 4. Does minor processing of the raw data.
 * 5. Inserts it into the database.
 */

import { exec } from 'child_process'
import * as fs from 'fs/promises'
import * as util from 'util'
import dayjs from 'dayjs'
import prisma from '../lib/prisma'
import { Agency, Program, ProgramService, Site, SiteProgram, Taxonomy } from '../types'
import * as schema from '../schema'

const execAsync = util.promisify(exec)
const { ADMIN_EMAIL } = process.env
let REPLACE: boolean

/**
 * Everything in our sqlite db is a string, so:
 * - convert numbers to strings
 * - convert booleans to '1' or '0'
 * - convert objects to json strings
 * - don't convert strings or nulls
 */
function processData(data: any[]) {
  const rv: any = []
  for (const o of data) {
    const o2: any = { id: o.Id }
    delete o.Id
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number') {
        o2[k] = String(v)
      } else if (typeof v === 'boolean') {
        o2[k] = v ? '1' : '0'
      } else if (v === null) {
        o2[k] = null
      } else if (typeof v === 'object') {
        o2[k] = JSON.stringify(v)
      } else {
        o2[k] = v
      }
    }
    rv.push(o2)
  }
  return rv
}

export async function insertAgencyData() {
  const agencyData = processData(require('../../data/json/agency.json'))
  if (!agencyData.length) {
    console.log('[insertAgencyData] agencyData is empty, skipping')
    return
  }
  const ids = agencyData.map((x) => x.id)
  const args: any = REPLACE ? {} : { where: { id: { in: ids } } }
  const { count } = await prisma.agency.deleteMany(args)
  console.log('[insertAgencyData] deleted %s rows', count)
  const result: Agency[] = []
  for (const data of agencyData) {
    for (const key of Object.keys(data)) {
      if (!schema.agency[key]) {
        // console.log('[insertAgencyData] key %s not in schema, remove', key)
        delete data[key]
      }
    }
    const agency = await prisma.agency.create({ data })
    result.push(agency)
  }
  console.log('[insertAgencyData] inserted %s rows', result.length)
}

export async function insertProgramData() {
  const programData = processData(require('../../data/json/program.json'))
  if (!programData.length) {
    console.log('[insertProgramData] programData is empty, skipping')
    return
  }
  const ids = programData.map((x) => x.id)
  const programsWithKeywords = await prisma.program.findMany({
    select: {
      id: true,
      keywords: true
    },
    where: {
      NOT: [{ keywords: null }, { keywords: '' }]
    }
  })
  const idToKeywords: any = {}
  for (const p of programsWithKeywords) {
    idToKeywords[p.id] = p.keywords
  }
  const args: any = REPLACE ? {} : { where: { id: { in: ids } } }
  const { count } = await prisma.program.deleteMany(args)
  console.log('[insertProgramData] deleted %s rows', count)
  const result: Program[] = []
  for (const data of programData) {
    for (const key of Object.keys(data)) {
      if (!schema.program[key]) {
        // console.log('[insertProgramData] key %s not in schema, remove', key)
        delete data[key]
      }
    }
    if (idToKeywords[data.id]) {
      data.keywords = idToKeywords[data.id]
    }
    const program = await prisma.program.create({ data })
    result.push(program)
  }
  console.log('[insertProgramData] inserted %s rows', result.length)
}

export async function insertProgramServiceData() {
  const programData = require('../../data/json/program.json')
  const programIds = programData.map((o) => o.Id)

  if (programIds.length || REPLACE) {
    const args0: any = REPLACE ? {} : { where: { Program__c: { in: programIds } } }
    const { count: count0 } = await prisma.program_service.deleteMany(args0)
    console.log('[insertProgramServiceData] deleted %s rows', count0)
  }

  const programServiceData = require('../../data/json/program_service.json').map((o: any) => ({
    id: o.Id,
    Program__c: o.Program__c,
    Taxonomy__c: o.Taxonomy__c,
    Name: o.Name,
    IsDeleted: o.IsDeleted,
    CreatedDate: o.CreatedDate,
    CreatedById: o.CreatedById,
    LastModifiedDate: o.LastModifiedDate,
    LastModifiedById: o.LastModifiedById,
    SystemModstamp: o.SystemModstamp
  }))

  const result: ProgramService[] = []
  for (const data of programServiceData) {
    for (const key of Object.keys(data)) {
      if (!schema.program_service[key]) {
        // console.log('[insertProgramServiceData] key %s not in schema, remove', key)
        delete data[key]
      }
    }
    const program_service = await prisma.program_service.create({ data })
    result.push(program_service)
  }
  console.log('[insertProgramServiceData] inserted %s rows', result.length)
}

export async function insertSiteData() {
  const siteData = processData(require('../../data/json/site.json'))
  if (!siteData.length) {
    console.log('[insertSiteData] siteData is empty, skipping')
    return
  }
  const ids = siteData.map((x) => x.id)
  const args: any = REPLACE ? {} : { where: { id: { in: ids } } }
  const { count } = await prisma.site.deleteMany(args)
  console.log('[insertSiteData] deleted %s rows', count)
  const result: Site[] = []
  for (const data of siteData) {
    for (const key of Object.keys(data)) {
      if (!schema.site[key]) {
        // console.log('[insertSiteData] key %s not in schema, remove', key)
        delete data[key]
      }
    }
    const site = await prisma.site.create({ data })
    result.push(site)
  }
  console.log('[insertSiteData] inserted %s rows', result.length)
}

export async function insertSiteProgramData() {
  const siteProgramData = processData(require('../../data/json/site_program.json'))
  if (!siteProgramData.length) {
    console.log('[insertSiteProgramData] siteProgramData is empty, skipping')
    return
  }
  const ids = siteProgramData.map((x) => x.id)
  const args: any = REPLACE ? {} : { where: { id: { in: ids } } }
  const { count } = await prisma.site_program.deleteMany(args)
  console.log('[insertSiteProgramData] deleted %s rows', count)
  const result: SiteProgram[] = []
  for (const data of siteProgramData) {
    for (const key of Object.keys(data)) {
      if (!schema.site_program[key]) {
        // console.log('[insertSiteProgramData] key %s not in schema, remove', key)
        delete data[key]
      }
    }
    const siteProgram = await prisma.site_program.create({ data })
    result.push(siteProgram)
  }
  console.log('[insertSiteProgramData] inserted %s rows', result.length)
}

export async function insertTaxonomyData() {
  const taxonomyData = processData(require('../../data/json/taxonomy.json'))
  if (!taxonomyData.length) {
    console.log('[insertTaxonomyData] taxonomyData is empty, skipping')
    return
  }
  const ids = taxonomyData.map((x) => x.id)
  const args: any = REPLACE ? {} : { where: { id: { in: ids } } }
  const { count } = await prisma.taxonomy.deleteMany(args)
  console.log('[insertTaxonomyData] deleted %s rows', count)
  const result: Taxonomy[] = []
  for (const data of taxonomyData) {
    for (const key of Object.keys(data)) {
      if (!schema.taxonomy[key]) {
        // console.log('[insertTaxonomyData] key %s not in schema, remove', key)
        delete data[key]
      }
    }
    const taxonomy = await prisma.taxonomy.create({ data })
    result.push(taxonomy)
  }
  console.log('[insertTaxonomyData] inserted %s rows', result.length)
}

export async function cleanup() {
  let files = await fs.readdir('./db')
  files = files.filter((f) => /db\.sqlite3\.\d{8}_\d{4}/.test(f))
  files.sort()
  while (files.length > 20) {
    const file = `./db/${files.shift()}`
    await fs.rm(file)
    console.log('[cleanup] deleted %s', file)
  }
}

async function main() {
  REPLACE = process.argv.includes('--replace')
  console.log('[insertData] begin, REPLACE=%s', REPLACE)
  console.log('[insertData] backing up db...')
  const dbFile = './db/db.sqlite3'
  const date = dayjs().format('YYYYMMDD_HHmm')
  const newFile = `./db/db.sqlite3.${date}`
  await fs.copyFile(dbFile, newFile)
  console.log('[insertData] wrote %s', newFile)

  try {
    await insertAgencyData()
    await insertProgramData()
    await insertProgramServiceData()
    await insertSiteData()
    await insertSiteProgramData()
    await insertTaxonomyData()
    await cleanup()
  } catch (err: any) {
    await fs.rename(newFile, dbFile)
    console.log('[insertData] rollback due to error, moved %s to %s', newFile, dbFile)
    // prettier-ignore
    await execAsync(`emailadmins --to="${ADMIN_EMAIL}" --subject="[open-resource-api] insertData.ts error"`)
    throw err
  }
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
