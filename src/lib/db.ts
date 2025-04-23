import { Database } from 'sqlite3'

const db = new Database(process.env.DB_FILE as string)

export default {
  query: (sql: string) => {
    return new Promise((resolve, reject) => {
      db.all(sql, (err: Error, rows: any[]) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
  }
}
