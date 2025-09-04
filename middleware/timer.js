export async function timer(c) {
  let startTime = Date.now()
  const response = await c.next()
  // c.waitUntil the rest?
  const duration = Date.now() - startTime
  console.log({ message: 'end of request', duration })
  return response
}
