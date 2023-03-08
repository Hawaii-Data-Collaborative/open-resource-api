import prisma from '../lib/prisma'

const GOOD_SEPARATOR = ';'

async function replaceAsteriskSeparators() {
  const badSeparator = ' * '
  const programs = await prisma.program.findMany({
    where: {
      Program_Taxonomies__c: {
        contains: badSeparator
      }
    }
  })

  for (const p of programs) {
    const oldValue = p.Program_Taxonomies__c
    const newValue = (p.Program_Taxonomies__c as string).replaceAll(badSeparator, GOOD_SEPARATOR)
    await prisma.program.update({
      data: { Program_Taxonomies__c: newValue },
      where: { id: p.id }
    })
    console.log(
      '[replaceAsteriskSeparators] updated program %s Program_Taxonomies__c from %s to %s',
      p.id,
      oldValue,
      newValue
    )
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
      if ((p.Program_Taxonomies__c as string).includes(taxWithComma.Name as string)) {
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

async function main() {
  await replaceAsteriskSeparators()
  await replaceCommaSeparators()
  // await fixNewlines()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
