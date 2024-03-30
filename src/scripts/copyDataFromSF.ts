/**
 * This script fetches the given SObject data from Salesforce
 * and writes it to the ./data/json folder.
 */

require('dotenv').config()

import fs from 'fs'
import querystring from 'querystring'
import * as schema from '../schema'
import { getAccessToken } from '../salesforce'

const BASE_URL = 'https://auw211.my.salesforce.com'

const LAST_SYNC_DATE = fs.readFileSync('./LAST_SYNC', 'utf-8').trim()

async function findAll(sobjectName, modelName) {
  console.log(`[findAll] querying for ${sobjectName}, LAST_SYNC_DATE=${LAST_SYNC_DATE}...`)
  const fieldsObj = schema[modelName]
  delete fieldsObj.id
  delete fieldsObj.keywords
  delete fieldsObj.attributes
  fieldsObj.Id = true
  const fieldsStr = Object.keys(fieldsObj).join(',')
  const params = querystring.stringify({
    q: `select ${fieldsStr} from ${sobjectName} where LastModifiedDate > ${LAST_SYNC_DATE}`
  })
  const token = await getAccessToken()
  const headers = { Authorization: `Bearer ${token}` }
  const res = await fetch(`${BASE_URL}/services/data/v60.0/query?${params}`, { headers })
  const tmp = await res.json()
  if (res.status !== 200) {
    throw new Error(JSON.stringify(tmp))
  }
  const data = tmp.records
  console.log('[findAll] sobjectName=%s data.length=%s', sobjectName, data.length)
  return data
}

async function save(tableName, data) {
  const filepath = `data/json/${tableName}.json`
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`[save] wrote ${filepath}`)
}

export async function copyDataFromSF(sobjectName, modelName) {
  const data = await findAll(sobjectName, modelName)
  await save(modelName, data)
  return data
}

async function main() {
  const sobjectName = process.argv[2]
  const modelName = process.argv[3]
  if (!(sobjectName && modelName)) {
    console.log('Usage: node copyDataFromSF <SObjectName> <TableName>')
    return
  }
  await copyDataFromSF(sobjectName, modelName)
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
