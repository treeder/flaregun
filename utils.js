export function hostname(c) {
  let req = c.request
  let h = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (h) {
    h = h.split(':')[0] // remove port
  }
  return h
}

export function hostURL(c) {
  let h = hostname(c)
  if (!h) return ''
  if (h.includes('localhost') || h.includes('127.0.0.1')) {
    let req = c.request
    let h2 = req.headers.get('x-forwarded-host') || req.headers.get('host')
    let port = ''
    if (h2) {
      let split = h2.split(':')
      if (split.length > 1) {
        port = `:${split[1]}`
      }
    }
    return `http://${h}${port}`
  }
  h = 'https://' + h
  return h
}

export function domainLevels(c) {
  const host = hostname(c)
  if (!host) return 2
  return host.endsWith('workers.dev') || host.endsWith('pages.dev') ? 3 : 2
}

export async function awaitAll(c, promises) {
  let results = await Promise.allSettled(promises)
  // c.data.logger.log('awaitAll results:', results)
  for (let r of results) {
    // c.data.logger.log(r)
    if (r.status == 'rejected') {
      console.log(`awaitAll error:`, r.reason)
      throw r.reason
    }
  }
}
