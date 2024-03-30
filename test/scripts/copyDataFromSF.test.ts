import { copyDataFromSF } from '../../src/scripts/copyDataFromSF'

test('copyDataFromSF', async () => {
  const rv = await copyDataFromSF('Program__c', 'program')
  expect(rv).not.toBeNull()
}, 600000)
