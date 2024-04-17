import { timeStringToDate } from '../src/util'

test('timeStringToDate', () => {
  expect((timeStringToDate('8:00am') as Date).toJSON().substring(11, 16)).toBe('18:00')
  expect((timeStringToDate('8:00 am') as Date).toJSON().substring(11, 16)).toBe('18:00')
  expect((timeStringToDate('12:00am') as Date).toJSON().substring(11, 16)).toBe('10:00')
  expect((timeStringToDate('12:00 pm') as Date).toJSON().substring(11, 16)).toBe('22:00')
  expect((timeStringToDate('1:00pm') as Date).toJSON().substring(11, 16)).toBe('23:00')
  expect((timeStringToDate('11:00 PM') as Date).toJSON().substring(11, 16)).toBe('09:00')
})
