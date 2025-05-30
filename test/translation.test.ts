import { translateText } from '../src/translation'

test('translateText()', async () => {
  const text = 'Hello, world!'
  const lang = 'haw'
  const result = await translateText(text, lang)
  expect(result).toContain('Aloha')
})
