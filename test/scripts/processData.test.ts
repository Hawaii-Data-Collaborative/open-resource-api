import { splitProgramTaxonomyColumns } from '../../src/scripts/processData'

test(
  'splitProgramTaxonomyColumns()',
  async () => {
    await splitProgramTaxonomyColumns()
  },
  1000 * 60
)
