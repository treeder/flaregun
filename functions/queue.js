// https://developers.cloudflare.com/queues/configuration/javascript-apis/#consumer
export async function queue(c) {
  console.log('env:', c.env)
  console.log('d1?', c.env.D1)
  for (const message of c.batch.messages) {
    console.log('Received', message)
  }
}
