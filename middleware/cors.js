export async function cors(c) {
  let r
  if(c.request.method == 'OPTIONS'){
    r = new Response(null, {
      status: 204,
    })
  } else {
    r = await c.next()
  }
  r.headers.set('Access-Control-Allow-Origin', '*')
  r.headers.set('Access-Control-Max-Age', '86400')
  // response.headers.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  r.headers.set('Access-Control-Allow-Methods', '*')
  r.headers.set('Access-Control-Allow-Headers', '*')
  return r
}
