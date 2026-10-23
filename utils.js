function canTrustForwardedHost(c, hostHeader) {
  if (c?.data?.env === 'dev' || c?.env?.ENV === 'dev') return true
  if (!hostHeader) return true
  const rawHost = hostHeader.split(':')[0].toLowerCase()
  return (
    rawHost === 'localhost' ||
    rawHost === '127.0.0.1' ||
    rawHost === '[::1]' ||
    rawHost.endsWith('.local')
  )
}

function getEffectiveHostHeader(c) {
  let req = c?.request || c
  const hostHeader = req?.headers?.get?.('host')
  const forwardedHost = req?.headers?.get?.('x-forwarded-host')
  if (forwardedHost && canTrustForwardedHost(c, hostHeader)) {
    return forwardedHost.split(',')[0].trim()
  }
  return hostHeader || null
}

export function hostname(c) {
  let h = getEffectiveHostHeader(c)
  if (h) {
    h = h.split(':')[0] // remove port
  }
  return h
}

export function hostURL(c) {
  let h = hostname(c)
  if (!h) return ''
  const lower = h.toLowerCase()
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '[::1]') {
    let h2 = getEffectiveHostHeader(c)
    let port = ''
    if (h2) {
      let split = h2.split(':')
      if (split.length > 1 && /^\d+$/.test(split[split.length - 1])) {
        port = `:${split[split.length - 1]}`
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
  return host.endsWith('.workers.dev') || host.endsWith('.pages.dev') ? 3 : 2
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
