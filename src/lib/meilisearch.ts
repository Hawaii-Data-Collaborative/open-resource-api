import { MeiliSearch } from 'meilisearch'

const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700'
const meilisearch = new MeiliSearch({ host })

export default meilisearch
