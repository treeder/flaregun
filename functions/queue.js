// https://developers.cloudflare.com/queues/configuration/javascript-apis/#consumer
import { User } from './models/user.js'
import { D1 } from '../d1.js'

export async function queue(c) {
  console.log('env:', c.env)
  console.log('d1?', c.env.D1)
  let d1 = new D1(c.env.D1)
  let r = d1.first(User)
  console.log('first user:', r)
  for (const message of c.batch.messages) {
    console.log('Received', message)
  }
}
