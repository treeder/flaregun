export async function cors(c) {
  let r
  if (c.request.method == 'OPTIONS') {
    r = new Response(null, {
      status: 204,
    })
  } else {
    r = await c.next()
  }
  const allowedOrigin = c.env?.CORS_ORIGIN || '*'
  r.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  r.headers.set('Access-Control-Max-Age', '86400')
  r.headers.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  r.headers.set('Access-Control-Allow-Headers', '*')
  return r
}
