import { ClassMigrations } from 'migrations'
import { User } from './models/user.js'
import { D1 } from '../d1.js'
import { ErrorHandler } from '../errors.js'
import { once } from 'once'
import { cors } from '../middleware/cors.js'
import { timer } from '../middleware/timer.js'

let errorHandler = null

export async function wrap(c) {
  c.data.d1 = new D1(c.env.D1)
  c.data.d1.debug = true
  try {
    await once(init, c)
    return await c.next()
  } catch (e) {
    return errorHandler.handle(c, e)
  }
}

async function init(c) {
  console.log('ONE')

  errorHandler = new ErrorHandler({
    postTo: {
      url: c.env.ERROR_URL,
      options: {
        method: 'POST',
        body: (message) => {
          return { text: message }
        },
      },
    },
  })

  let migrations = new ClassMigrations(c.data.d1, [User])
  await migrations.run(c.data.d1)
}

export const onRequest = [timer, cors, wrap]
