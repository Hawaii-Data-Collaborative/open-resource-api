import { Pool } from 'pg'

const DB_URL = process.env.DB_URL
if (!DB_URL) {
  throw new Error('DB_URL is not set')
}

const pool = new Pool({ connectionString: DB_URL })

export default {
  query: async (sql: string, params?: any[]) => {
    const result = await pool.query(sql, params)
    return result.rows
  }
}
