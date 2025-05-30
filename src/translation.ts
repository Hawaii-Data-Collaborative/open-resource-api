import { TranslationServiceClient } from '@google-cloud/translate'

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID
const LOCATION = 'global'

const translationClient = new TranslationServiceClient()

export async function translateText(text: string, lang: string) {
  const request = {
    parent: `projects/${PROJECT_ID}/locations/${LOCATION}`,
    contents: [text],
    mimeType: 'text/plain',
    sourceLanguageCode: 'en',
    targetLanguageCode: lang
  }

  const [response] = await translationClient.translateText(request)
  const translation = response.translations?.[0]
  const translatedText = translation?.translatedText ?? null
  return translatedText
}
