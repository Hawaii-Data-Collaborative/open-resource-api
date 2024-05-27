import { populateAccountNameField, splitProgramTaxonomyColumns } from '../../src/scripts/processData'

test(
  'splitProgramTaxonomyColumns()',
  async () => {
    await splitProgramTaxonomyColumns()
  },
  1000 * 60
)

test('populateAccountNameField()', async () => {
  const programs = await populateAccountNameField()
  console.log(`updated ${programs.length} programs`)
}, 60000)
