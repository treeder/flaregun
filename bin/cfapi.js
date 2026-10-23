/**
 * curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database \
  -H 'Content-Type: application/json' \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -d '{
  "name": "my-database",
    "primary_location_hint": "wnam"
} '
 */

import { api } from 'api'

const apiURL = 'https://api.cloudflare.com/client/v4'

export async function fetchCF(c, path, opts = {}) {
  let q = ''
  if (opts.q) {
    const params = new URLSearchParams()
    for (let k in opts.q) {
      params.append(k, opts.q[k])
    }
    const qs = params.toString()
    if (qs) q = `?${qs}`
  }
  let u = `${apiURL}/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID || '')}${path}${q}`
  console.log(u)
  let r = await api(u, {
    ...{
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
    },
    ...opts,
  })
  // console.log(r)
  return r
}
