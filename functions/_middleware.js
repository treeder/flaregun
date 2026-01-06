import { ClassMigrations } from 'migrations'
import { User } from './data/users.js'
import { Post } from './data/posts.js'
import { D1 } from '../d1.js'
import { ErrorHandler } from '../errors.js'
import { once } from 'once'
import { cors } from '../middleware/cors.js'
import { timer } from '../middleware/timer.js'
import { CloudflareLogger } from '../logger.js'
import { nanoid } from 'nanoid'

export async function wrap(c) {
  c.data.d1 = new D1(c.env.D1)
  c.data.d1.debug = true

  let url = new URL(c.request.url)
  let logger = new CloudflareLogger({
    data: { requestId: nanoid(), path: url.pathname, method: c.request.method },
  })
  c.data.logger = logger

  try {
    await once(init, c)
    return await c.next()
  } catch (e) {
    let errorHandler = new ErrorHandler({
      appName: 'flaregun example',
      logger: c.data.logger,
      force: true,
      ...(c.env.ERROR_URL && {
        postTo: {
          url: c.env.ERROR_URL,
          options: {
            method: 'POST',
            body: (message) => {
              return { text: message }
            },
          },
        },
      }),
    })

    return errorHandler.handle(c, e)
  }
}

async function init(c) {
  console.log('ONE')

  let migrations = new ClassMigrations(c.data.d1, [User, Post])
  await migrations.run(c.data.d1)
}

export const onRequest = [timer, cors, wrap]
