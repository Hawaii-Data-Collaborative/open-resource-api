import { parseTimeString } from '../src/util'

test('parseTimeString', () => {
  expect(parseTimeString('8:00am')).toBe('0800')
  expect(parseTimeString('8:00 am')).toBe('0800')
  expect(parseTimeString('12:00am')).toBe('0000')
  expect(parseTimeString('12:00 pm')).toBe('1200')
  expect(parseTimeString('11:59 am')).toBe('1159')
  expect(parseTimeString('12:01 pm')).toBe('1201')
  expect(parseTimeString('1:00pm')).toBe('1300')
  expect(parseTimeString('11:00 PM')).toBe('2300')
  expect(parseTimeString('11:59 PM')).toBe('2359')
})
