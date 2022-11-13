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
    const newValue = p.Program_Taxonomies__c.replaceAll(badSeparator, GOOD_SEPARATOR)
    await prisma.program.update({
      data: { Program_Taxonomies__c: newValue },
      where: { Id: p.Id }
    })
    console.log(
      '[replaceAsteriskSeparators] updated program %s Program_Taxonomies__c from %s to %s',
      p.Id,
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
      if (p.Program_Taxonomies__c.includes(taxWithComma.Name)) {
        skip = true
        break
      }
    }
    if (skip) {
      continue
    }

    const oldValue = p.Program_Taxonomies__c
    const newValue = p.Program_Taxonomies__c.split(',')
      .map((s) => s.trim())
      .join(GOOD_SEPARATOR)
    await prisma.program.update({
      data: { Program_Taxonomies__c: newValue },
      where: { Id: p.Id }
    })
    console.log(
      '[replaceCommaSeparators] updated program %s Program_Taxonomies__c from %s to %s',
      p.Id,
      oldValue,
      newValue
    )
  }

  console.log('[replaceCommaSeparators] updated %s programs', programs.length)
}

async function fixNewlines() {
  const programs = await prisma.program.findMany({
    where: { Service_Description__c: { contains: '\\n' } }
  })

  for (const p of programs) {
    const oldValue = p.Service_Description__c
    const newValue = p.Service_Description__c.replaceAll('\\n', '\n')
    await prisma.program.update({
      data: { Service_Description__c: newValue },
      where: { Id: p.Id }
    })
    console.log('[fixNewlines] updated program %s Service_Description__c from %s to %s', p.Id, oldValue, newValue)
  }

  console.log('[fixNewlines] updated %s programs', programs.length)
}

async function main() {
  await replaceAsteriskSeparators()
  await replaceCommaSeparators()
  await fixNewlines()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
