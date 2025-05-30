import _ from 'lodash'
import prisma from '../lib/prisma'

const GOOD_SEPARATOR = ';'

const PROGRAM_TAX_COLUMNS = [
  'Program_Taxonomies__c',
  'Taxonomy_1__c',
  'Taxonomy_2__c',
  'Taxonomy_3__c',
  'Taxonomy_4__c',
  'Taxonomy_5__c',
  'Taxonomy_6__c',
  'Taxonomy_7__c',
  'Taxonomy_8__c',
  'Taxonomy_9__c',
  'Taxonomy_10__c'
]

async function replaceAsteriskSeparators() {
  const badSeparator = ' * '
  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { Program_Taxonomies__c: { contains: badSeparator } },
        { Taxonomy_1__c: { contains: badSeparator } },
        { Taxonomy_2__c: { contains: badSeparator } },
        { Taxonomy_3__c: { contains: badSeparator } },
        { Taxonomy_4__c: { contains: badSeparator } },
        { Taxonomy_5__c: { contains: badSeparator } },
        { Taxonomy_6__c: { contains: badSeparator } },
        { Taxonomy_7__c: { contains: badSeparator } },
        { Taxonomy_8__c: { contains: badSeparator } },
        { Taxonomy_9__c: { contains: badSeparator } },
        { Taxonomy_10__c: { contains: badSeparator } }
      ]
    }
  })

  for (const p of programs) {
    const args: any = {}

    for (const taxColumn of PROGRAM_TAX_COLUMNS) {
      if (typeof p[taxColumn] == 'string' && p[taxColumn].includes(badSeparator)) {
        args[taxColumn] = p[taxColumn].replaceAll(badSeparator, GOOD_SEPARATOR)
      }
    }
    await prisma.program.update({
      data: args,
      where: { id: p.id }
    })
    console.log('[replaceAsteriskSeparators] updated program %s, args=%j', p.id, args)
  }

  console.log('[replaceAsteriskSeparators] updated %s programs', programs.length)
}

async function replaceCommaSeparators() {
  const taxonomiesWithCommas = await prisma.taxonomy.findMany({
    where: { Name: { contains: ',' } }
  })

  const programs = await prisma.program.findMany({
    where: {
      Program_Taxonomies__c: {
        contains: ','
      }
    }
  })

  for (const p of programs) {
    let skip = false
    for (const taxWithComma of taxonomiesWithCommas) {
      if ((p.Program_Taxonomies__c as string).includes(taxWithComma.Name)) {
        skip = true
        break
      }
    }
    if (skip) {
      continue
    }

    const oldValue = p.Program_Taxonomies__c
    const newValue = (p.Program_Taxonomies__c as string)
      .split(',')
      .map((s) => s.trim())
      .join(GOOD_SEPARATOR)
    await prisma.program.update({
      data: { Program_Taxonomies__c: newValue },
      where: { id: p.id }
    })
    console.log(
      '[replaceCommaSeparators] updated program %s Program_Taxonomies__c from %s to %s',
      p.id,
      oldValue,
      newValue
    )
  }

  console.log('[replaceCommaSeparators] updated %s programs', programs.length)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fixNewlines() {
  const programs = await prisma.program.findMany({
    where: {
      OR: [{ Service_Description__c: { contains: '\\n' } }, { Hours__c: { contains: '\\n' } }]
    }
  })

  for (const p of programs) {
    const oldValue1 = p.Service_Description__c
    const newValue1 = (p.Service_Description__c as string).replaceAll('\\n', '\n')

    const oldValue2 = p.Hours__c
    const newValue2 = (p.Hours__c as string).replaceAll('\\n', '\n')

    await prisma.program.update({
      data: {
        Service_Description__c: newValue1,
        Hours__c: newValue2
      },
      where: { id: p.id }
    })

    console.log(
      '[fixNewlines] updated program %s\n  old Service_Description__c: %s\n  new Service_Description__c: %s\n  old Hours__c: %s\n  new Hours__c: %s',
      p.id,
      oldValue1,
      newValue1,
      oldValue2,
      newValue2
    )
  }

  console.log('[fixNewlines] updated %s programs', programs.length)
}

export async function splitProgramTaxonomyColumns() {
  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { Taxonomy_1__c: { contains: ';' } },
        { Taxonomy_2__c: { contains: ';' } },
        { Taxonomy_3__c: { contains: ';' } },
        { Taxonomy_4__c: { contains: ';' } },
        { Taxonomy_5__c: { contains: ';' } },
        { Taxonomy_6__c: { contains: ';' } },
        { Taxonomy_7__c: { contains: ';' } },
        { Taxonomy_8__c: { contains: ';' } },
        { Taxonomy_9__c: { contains: ';' } },
        { Taxonomy_10__c: { contains: ';' } }
      ]
    }
  })

  for (const p of programs) {
    let all: string[] = []
    const taxColumns = PROGRAM_TAX_COLUMNS.slice(1)
    for (const taxColumn of taxColumns) {
      if (typeof p[taxColumn] === 'string' && p[taxColumn]) {
        all.push(...p[taxColumn].split(';'))
      }
    }
    all = _.uniq(all)
    let tax = all.shift()
    let i = 0
    const args: any = {}
    while (i < taxColumns.length) {
      const taxColumn = taxColumns[i]
      args[taxColumn] = tax || null
      tax = all.shift()
      i++
    }
    await prisma.program.update({
      data: args,
      where: { id: p.id }
    })
    console.log('[splitProgramTaxonomyColumns] updated program %s, args=%j', p.id, args)
  }
}

export async function populateAccountNameField() {
  const allAgencies = await prisma.agency.findMany()
  const agencyMap = {}
  for (const a of allAgencies) {
    agencyMap[a.id] = a.Name
  }

  const programs = await prisma.program.findMany({ where: { OR: [{ AccountName: null }, { AccountName: '' }] } })
  const updatedPrograms: any[] = []
  for (const p of programs) {
    if (p.Account__c && agencyMap[p.Account__c]) {
      const name = agencyMap[p.Account__c]
      const updatedProgram = await prisma.program.update({
        data: { AccountName: name },
        where: { id: p.id }
      })
      updatedPrograms.push(updatedProgram)
      console.log('[populateAccountNameField] updated program %s, AccountName=%s', p.id, name)
    }
  }

  return updatedPrograms
}

async function main() {
  await replaceAsteriskSeparators()
  await replaceCommaSeparators()
  // await fixNewlines()
  await splitProgramTaxonomyColumns()
  await populateAccountNameField()
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
