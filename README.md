# Flaregun

JavaScript helpers for Cloudflare dev services.

## Starter kit

Check out [the starter kit](https://github.com/treeder/flaregun-starter) for a quick start. This will setup everything you need to run a full-stack cloudflare app.

## Install

```sh
npm install treeder/flaregun
```

## D1 Sqlite Database

This handles inserting and updating objects, assigning IDs, nested JSON objects, etc.

```js
import { D1 } from 'flaregun'

// D1
let d1 = new D1(env.D1) // just adds some extra functionality to the built in d1 interface, you can still use it just as you normally would too.

// then you can use the new functions
// insert new data
let user = {name: 'Jimbo', email: 'x@y.com'}
await d1.insert('users', user)

user.name = 'Jim Bean'
// update a row
await d1.update('users', user.id, user)

// get object
user = d1.get('users', user.id)

// querying
// simple equality queries
let users = await d1.query('users', {
    where: { email: 'x@y.com },
})

// more complex queries
let users = await d1.query('users', {
    where: [['orgId', '=', orgId], ['createdAt', '>', new Date(Date.now() - 48 * 60 * 60 * 1000)]],
    order: ['createdAt', 'asc'],
    limit: 100,
})

// querying JSON data using path notation
let users = await d1.query('users', {
  where: [['data.awesome', '=', true]],
})

// counts 
let userCount = await d1.count('users', {
  where: { orgId }
})
```

### Using models for field parsing

Recommended: D1 supports using [models](https://github.com/treeder/models) to parse fields into the proper object types. This is the same format as for [Lit](https://lit.dev) properties AND you can use the
same models for automatic [migrations](https://github.com/treeder/migrations), JSON parsing, etc. 

First, define your models with JavaScript types or custom parsers (see [models](https://github.com/treeder/models) for more info). 

```js
export class User {
  static table = 'users'
  static properties = {
    id: {
      type: String,
      primaryKey: true,
    },
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    data: {
      type: Object, // this is stored as a JSON object so you can stuff anything in here and still query on it.
    },
  }
}
```

Then use it like this:

```js
let users = await d1.get(User, userId)
```

This will parse the dates, booleans, JSON, etc into the proper types.

## Error Handler

This is a special error handler that will format your error nicely formatted for Cloudflare logging and
the ability to send notifications, etc.

In your global request handler (if you're using cloudflare workers file based routing, in your root `_middleware.js`).

```js
// define your ErrorHandler with options
const errorHandler = new ErrorHandler()

// then in your global wrapper:
try {
  await c.next()
} catch (err) {
  return errorHandler.handle(c, err)
}
```

### Error Alerts

You can have the errors sent to a webhook:

```js
const errorHandler = new ErrorHandler({
  postTo: {
    url: 'https://chat.googleapis.com/v1/spaces/AAQAsw9EPWU/messages?key=X&token=Y',
    options: {
      method: 'POST',
      body: (message) => {
        return { text: message }
      },
    },
  },
})
```

Change the body function to change the format expected by the webhook service you are using.

To prevent duplicate errors, ensure you have a key/value store binding at `env.KV`.

## Scheduler

This makes it easy to handle events on a schedule.

```js
const scheduler = new Scheduler()
scheduler.addEventListener('hour', myFunction)
```

That will call `myFunction(c)` every hour. You can use minute, hour, day, week, month too.

Setup a cron trigger in your worker settings to run every minute: `*/1 * * * *`

And add this scheduled function to your worker:

```js
async scheduled(event, env, ctx) {
  // let scheduledTime = new Date(event.scheduledTime)
  console.log(`Scheduled event fired. cron: ${event.cron}`)
  try {
    await scheduler.run(event)
  } catch(e){
    console.error(e)
  }
}
```

## Logging

You can use CloudflareLogger to get nicely formatted messages for cloudflare logging while
using it just like console.log. Setup in `_middleware.js` like this:

```js
let rid = nanoid()
let url = new URL(req.url)
c.data.logger = new CloudflareLogger({ data: { requestId: rid, path: url.pathname } })
```

The extra data added above will be logged in all messages for easy filtering.

Then use it:

```js
c.data.logger.log('This is a message')
// with more data
c.data.logger.log('This is a message', { foo: 'bar' })
// errors
c.data.logger.log(new Error('This is an error'))
```

If you want to add some data along the way, in middleware or during function chains:

```js
let logger = c.data.logger.with('foo', 'bar')
logger.log('This is a message')
```

## Middleware

If you're using Wrangler file based routing, you can add our middleware. 

Add this to your root `_middleware.js`:

```js
import { timer } from 'flaregun/middleware/timer.js'
import { cors } from 'flaregun/middleware/cors.js'

export async function wrap(c) {
  // your own things can go here
}

export const onRequest = [timer, cors, wrap]
```
