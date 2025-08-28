# Flaregun

JavaScript helpers for Cloudflare dev services.

## Starter kit

Check out [the starter kit](./starter) for a quick start. This will setup everything you need to run a full-stack cloudflare app.

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

// querying
let users = await d1.query('users', {
    where: [['orgID', '=', orgID], ['createdAt', '>', new Date(Date.now() - 48 * 60 * 60 * 1000)]],
    order: ['createdAt', 'asc'],
    limit: 100,
})

// querying JSON data using path notation
let users = await d1.query('users', {
  where: [['data.awesome', '=', true]],
}
```

### Using models for fields

Use models for parsing fields. This is the same format as for [Lit](https://lit.dev) properties AND you can use the
same models for automatic [migrations](https://github.com/treeder/migrations)!

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
let users = await d1.query('users', {
    model: User,
}
```

This will parse the dates, JSON, etc into the proper types.

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

export async function onRequestPost(c) {
c.data.logger.log('scheduler triggered!')

let res = new Response('Hello, schedulo!')
try {
let input = await c.request.json()
c.data.logger.log('scheduled input:', input)
} catch (e) {
c.data.logger.log('error:', e)
res = new Response(`${e.message}`, { status: e.status || 500 })
}
return res
}

```

```
