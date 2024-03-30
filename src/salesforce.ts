import querystring from 'querystring'

const { SF_CONSUMER_KEY, SF_CONSUMER_SECRET } = process.env
if (!(SF_CONSUMER_KEY && SF_CONSUMER_SECRET)) {
  throw new Error('SF_CONSUMER_KEY/SF_CONSUMER_SECRET missing')
}

const BASE_URL = 'https://auw211.my.salesforce.com'

export async function getAccessToken() {
  const body = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: SF_CONSUMER_KEY,
    client_secret: SF_CONSUMER_SECRET
  })
  const res = await fetch(BASE_URL + '/services/oauth2/token', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    body
  })
  const data = await res.json()
  return data.access_token
}
