/**
 * Migrates data from SQLite to PostgreSQL.
 */

import sqlite3 from 'sqlite3'
import { promisify } from 'util'
import { Pool } from 'pg'

const { DB_URL, DB_FILE } = process.env
console.log('DB_URL=%s DB_FILE=%s', DB_URL, DB_FILE)

// PostgreSQL connection configuration
const pgPool = new Pool({ connectionString: DB_URL })

interface SqliteTable {
  name: string
}

interface SqliteRow {
  [key: string]: any
}

async function migrateData() {
  // Open SQLite database
  const db = new sqlite3.Database(DB_FILE as string)
  const dbAll = promisify(db.all.bind(db))

  try {
    // Get all table names from SQLite
    const tables = (await dbAll("SELECT name FROM sqlite_master WHERE type='table'")) as SqliteTable[]

    for (const table of tables) {
      const tableName = table.name

      // Skip sqlite_sequence table
      if (tableName === 'sqlite_sequence') continue

      console.log(`Processing ${tableName} table...`)

      // Get all data from the table
      const rows = (await dbAll(`SELECT * FROM ${tableName}`)) as SqliteRow[]

      if (rows.length === 0) {
        console.log(`No data to migrate for table ${tableName}`)
        continue
      }

      // Get column names from the first row
      const columnNames = Object.keys(rows[0])
      const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(',')

      // Create the insert query
      const insertQuery = `
        INSERT INTO "${tableName}" ("${columnNames.join('","')}")
        VALUES (${placeholders})
      `

      process.stdout.write(`Migrating data for table ${tableName}... `)
      // Insert data into PostgreSQL
      for (const row of rows) {
        // Convert SQLite row to PostgreSQL format
        const values = columnNames.map((column) => {
          let value = row[column]
          if (['createdAt', 'updatedAt'].includes(column) && /^\d+$/.test(value)) {
            value = new Date(Number(value)).toISOString()
          }
          return value
        })

        console.log(insertQuery, values)
        await pgPool.query(insertQuery, values)
      }

      console.log('Done.')
    }

    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Error during migration:', error)
  } finally {
    // Close connections
    db.close()
    await pgPool.end()
  }
}

// Run the migration
migrateData().catch(console.error)
