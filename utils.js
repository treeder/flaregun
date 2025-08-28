export async function awaitAll(c, promises) {
  let results = await Promise.allSettled(promises)
  c.data.logger.log('awaitAll results:', results)
  for (let r of results) {
    // c.data.logger.log(r)
    if (r.status == 'rejected') {
      c.data.logger.log(`awaitAll error:`, r.reason)
      throw r.reason
    }
  }
}
