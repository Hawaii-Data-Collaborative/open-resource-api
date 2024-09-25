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
  let data = await res.json()
  if (res.status !== 200) {
    throw new Error(JSON.stringify(data))
  }
  const allRecords = [...data.records]
  while (!data.done) {
    const nextUrl = `${BASE_URL}${data.nextRecordsUrl}`
    const res = await fetch(nextUrl, { headers })
    data = await res.json()
    if (res.status !== 200) {
      throw new Error(JSON.stringify(data))
    }
    allRecords.push(...data.records)
  }
  console.log('[findAll] sobjectName=%s allRecords.length=%s', sobjectName, allRecords.length)
  return allRecords
}

async function fetchProgramServices(programIds: string[]) {
  console.log(`[fetchProgramServices] programIds=${programIds.join(',')}`)
  const fieldsObj: any = { ...schema.program_service }
  delete fieldsObj.id
  delete fieldsObj.keywords
  delete fieldsObj.attributes
  fieldsObj.Id = true
  const fieldsStr = Object.keys(fieldsObj).join(',')
  const params = querystring.stringify({
    q: `select ${fieldsStr} from Program_Service__c where Program__c in ('${programIds.join("','")}')`
  })
  const token = await getAccessToken()
  const headers = { Authorization: `Bearer ${token}` }
  const res = await fetch(`${BASE_URL}/services/data/v60.0/query?${params}`, { headers })
  let data = await res.json()
  if (res.status !== 200) {
    throw new Error(JSON.stringify(data))
  }
  const allRecords = [...data.records]
  while (!data.done) {
    const nextUrl = `${BASE_URL}${data.nextRecordsUrl}`
    const res = await fetch(nextUrl, { headers })
    data = await res.json()
    if (res.status !== 200) {
      throw new Error(JSON.stringify(data))
    }
    allRecords.push(...data.records)
  }
  console.log('[fetchProgramServices] allRecords.length=%s', allRecords.length)
  return allRecords
}

async function fetchSitePrograms(programIds: string[]) {
  console.log(`[fetchSitePrograms] programIds=${programIds.join(',')}`)
  const fieldsObj: any = { ...schema.site_program }
  delete fieldsObj.id
  delete fieldsObj.keywords
  delete fieldsObj.attributes
  fieldsObj.Id = true
  const fieldsStr = Object.keys(fieldsObj).join(',')
  const params = querystring.stringify({
    q: `select ${fieldsStr} from Site_Program__c where Program__c in ('${programIds.join("','")}')`
  })
  const token = await getAccessToken()
  const headers = { Authorization: `Bearer ${token}` }
  const res = await fetch(`${BASE_URL}/services/data/v60.0/query?${params}`, { headers })
  let data = await res.json()
  if (res.status !== 200) {
    throw new Error(JSON.stringify(data))
  }
  const allRecords = [...data.records]
  while (!data.done) {
    const nextUrl = `${BASE_URL}${data.nextRecordsUrl}`
    const res = await fetch(nextUrl, { headers })
    data = await res.json()
    if (res.status !== 200) {
      throw new Error(JSON.stringify(data))
    }
    allRecords.push(...data.records)
  }
  console.log('[fetchSitePrograms] allRecords.length=%s', allRecords.length)
  return allRecords
}

async function save(tableName, data) {
  const filepath = `data/json/${tableName}.json`
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`[save] wrote ${filepath}`)
}

export async function copyDataFromSF(sobjectName, modelName) {
  const data = await findAll(sobjectName, modelName)
  await save(modelName, data)

  if (sobjectName === 'Program__c') {
    const programIds = data.map((o) => o.Id)
    const data2 = await fetchProgramServices(programIds)
    await save('program_service', data2)

    const data3 = await fetchSitePrograms(programIds)
    await save('site_program', data3)
  }

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
