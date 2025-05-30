import prisma from '../lib/prisma'
import { LANGUAGES, translationFieldMap } from '../constants'
import { translateText } from '../translation'

const cache = {}
for (const lang of LANGUAGES) {
  cache[lang] = {}
}

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

    for (const lang of LANGUAGES) {
      const existingTranslation = existingTranslations.find((t) => t.language === lang)

      const translatedData: any = {
        [`${table}Id`]: record.id,
        language: lang
      }

      let doInsert = false

      for (const [sourceField, targetField] of fieldMap) {
        if (existingTranslation && existingTranslation[targetField]) {
          console.log(
            `[translate] i=${i} ${table}_translation ${existingTranslation.id} already exists and targetField ${targetField} is populated, lang=${lang}`
          )
          continue
        }

        let text = record[sourceField]
        if (typeof text === 'string' && text.trim().length > 0) {
          text = text.trim()
          if (cache[lang][text]) {
            const translatedText = cache[lang][text]
            console.log(`[translate] i=${i} cache hit, lang=${lang} text="${text}" translatedText="${translatedText}"`)
            translatedData[targetField] = translatedText
            doInsert = true
          } else {
            const translatedText = await translateText(text, lang)
            translatedData[targetField] = translatedText
            cache[lang][text] = translatedText
            doInsert = true
          }
        }
      }

      if (doInsert) {
        const translation = await prisma[`${table}_translation`].create({
          data: translatedData
        })

        console.log(`[translate] i=${i} created ${table}_translation ${translation.id} for language ${lang}`)
      } else if (existingTranslation) {
        console.log(
          `[translate] i=${i} ${table}_translation ${existingTranslation.id} already exists and all fields are populated, lang=${lang}`
        )
      } else {
        console.log(`[translate] i=${i} nothing to do for ${table} id ${record.id}, lang=${lang}`)
      }
    }
  }
}

translate().catch(console.error)
