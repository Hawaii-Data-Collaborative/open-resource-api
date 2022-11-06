import fs from 'fs';
import { Client as elasticClient } from '@elastic/elasticsearch';

const elasticsearch = new elasticClient({
  node: process.env.ELASTIC_URL,
  auth: {
    apiKey: process.env.ELASTIC_API_KEY as string,
  },
  ssl: {
    ca: fs.readFileSync('./http_ca.crt'),
    rejectUnauthorized: false
  }
});

export default elasticsearch;
