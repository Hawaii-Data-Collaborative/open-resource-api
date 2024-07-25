import { cleanup, insertProgramData, insertProgramServiceData, main } from '../../src/scripts/insertData'

test('main()', async () => {
  await main()
}, 60000)

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
