import prisma from '../lib/prisma'
import { LANGUAGES, translationFieldMap } from '../constants'
import { translateText } from '../translation'

async function translate() {
  // Parse CLI arguments
  const args = process.argv.slice(2)
  const tableArg = args.find((arg) => arg.startsWith('--table='))?.split('=')[1]
  const limitArg = args.find((arg) => arg.startsWith('--limit='))?.split('=')[1]
  const offsetArg = args.find((arg) => arg.startsWith('--offset='))?.split('=')[1]

  if (!tableArg) {
    console.error('--table argument is required')
    process.exit(1)
  }

  const table = tableArg
  const limit = limitArg ? parseInt(limitArg) : 100
  const offset = offsetArg ? parseInt(offsetArg) : 0

  // Get the translation field map for the specified table
  const fieldMap = translationFieldMap[table]
  if (!fieldMap) {
    console.error(`No translation field map found for table "${table}"`)
    process.exit(1)
  }

  const createdAtCol = table === 'category' ? 'createdAt' : 'CreatedDate'
  const updatedAtCol = table === 'category' ? 'updatedAt' : 'LastModifiedDate'

  // Get the batch of records from the specified table
  const records = await prisma[table].findMany({
    take: limit,
    skip: offset,
    orderBy: [{ [updatedAtCol]: 'desc' }, { [createdAtCol]: 'desc' }, { id: 'desc' }]
  })

  console.log(`[translate] processing ${records.length} ${table} records`)

  // For each record, check if translations exist for all languages
  for (const [i, record] of records.entries()) {
    const existingTranslations = await prisma[`${table}_translation`].findMany({
      where: {
        [`${table}Id`]: record.id
      }
    })

    const missingLanguages = LANGUAGES.filter((lang) => !existingTranslations.some((t) => t.language === lang))

    if (missingLanguages.length === 0) {
      console.log(`[translate] i=${i} all translations exist for ${table} ${record.id}`)
      continue
    }

    console.log(`[translate] i=${i} missing translations for ${table} ${record.id}: ${missingLanguages.join(',')}`)

    // For each missing language, translate the fields and create translation records
    for (const lang of missingLanguages) {
      const translatedData: any = {
        [`${table}Id`]: record.id,
        language: lang
      }

      for (const [sourceField, targetField] of fieldMap) {
        const text = record[sourceField]
        if (typeof text === 'string' && text.trim().length > 0) {
          const translatedText = await translateText(text.trim(), lang)
          translatedData[targetField] = translatedText
        }
      }

      const translation = await prisma[`${table}_translation`].create({
        data: translatedData
      })

      console.log(`[translate] i=${i} created ${table}_translation ${translation.id} for language ${lang}`)
    }
  }
}

translate().catch(console.error)
