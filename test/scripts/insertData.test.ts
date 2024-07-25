import { cleanup, insertProgramData, insertProgramServiceData } from '../../src/scripts/insertData'

test('insertProgramData()', async () => {
  await insertProgramData()
}, 60000)

test('insertProgramServiceData()', async () => {
  const rv = await insertProgramServiceData()
  expect(rv).not.toBeNull()
}, 600000)

test('cleanup()', async () => {
  await cleanup()
})
