import { insertProgramData } from '../../src/scripts/insertData'

test(
  'insertProgramData()',
  async () => {
    await insertProgramData()
  },
  1000 * 60
)
