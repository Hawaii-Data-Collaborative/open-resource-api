import bcrypt from 'bcrypt'
import { Response } from 'koa'
import { authService } from '../../src/services'

test('hashPassword()', async () => {
  const result = authService.hashPassword('asdf')
  expect(bcrypt.compareSync('asdf', result)).toBe(true)
})

test('login()', async () => {
  const result = await authService.login('kmulleady+test@hawaiidata.org', '*****', {
    set: jest.fn()
  } as unknown as Response)
  expect(result).not.toBeNull()
})

test('signup()', async () => {
  const result = await authService.signup('kmulleady+test@hawaiidata.org', '*****', {
    set: jest.fn()
  } as unknown as Response)
  expect(result).not.toBeNull()
})
