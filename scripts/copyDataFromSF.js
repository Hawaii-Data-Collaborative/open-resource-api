/**
 * This script fetches the given SObject data from Salesforce
 * and writes it to the ./data/json folder.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const jsforce = require('jsforce')

let conn

async function connect() {
  console.log('[connect] connecting')
  const username = process.env.SF_USER
  const password = process.env.SF_PASS
  const securityToken = process.env.SF_TOKEN
  const options = {}
  const logLevel = process.env.LOG_LEVEL
  if (logLevel) {
    options.logLevel = logLevel
  }
  conn = new jsforce.Connection(options)
  await conn.login(username, password + securityToken)
  console.log('[connect] connected')
}

async function findAll(sobjectName) {
  console.log(`[findAll] querying for ${sobjectName}...`)
  let data
  try {
    data = await conn.sobject(sobjectName).find().sort({ Name: 1 }).autoFetch(true).maxFetch(1000000).execute()
  } catch {
    data = await conn.sobject(sobjectName).find().autoFetch(true).maxFetch(1000000).execute()
  }
  console.log(`[findAll] found ${data.length} ${sobjectName} records`)
  return data
}

async function save(tableName, data) {
  const dirpath = path.resolve(__dirname, '../data/json')
  const filepath = `${dirpath}/${tableName}.json`
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath)
  }
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`[save] wrote ${filepath}`)
}

async function main() {
  const sobjectName = process.argv[2]
  const outputFileBaseName = process.argv[3]
  if (!(sobjectName && outputFileBaseName)) {
    console.log('Usage: node copyDataFromSF <SObjectName> <TableName>')
    return
  }
  await connect()
  const data = await findAll(sobjectName)
  await save(outputFileBaseName, data)
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
