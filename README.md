# cloudflare

JavaScript utils for Cloudflare dev services. 

## Install

```sh
npm install treeder/flaregun
```

## The big app wrapper - FlaregunApp

In `_worker.js`, simply create a new FlaregunApp and you're done. 

```js
let routes = new Hono()
routes.get('/', async (c) {
    return c.text('Hello World!')
})

let flareApp = new FlareApp({
    name: 'my-app',
    env: 'dev',
    init: initGlobals, // init function that will only run once on the first request
    static: ['./assets'], // files or directories
    private: ['./server', './views'],
    routes: new Hono(),
})

EITHER LET PEOPLE PASS IN HONO object or perhaps we just add the hono methods?

export default {
    async fetch(req, env, ctx) {
        return flareApp.fetch(req, env, ctx)
    },
}
```

## D1 wrapper to enhance D1 usage

The D1 class wraps a D1 binding and adds some extra functionality. 

* Generates and inserts unique `id`
* Sets createdAt and updatedAt fields
* Accepts objects to insert or update, instead of having to generate SQL and bind values. 

```js
import { D1 } from 'flaregun'

// D1
let d1 = new D1(env.D1) // just adds some extra functionality to the built in d1 interface, you can still use it just as you normally would too.

// then you can use the new functions
// insert new data
await d1.insert('users', { name: 'Jimbo', email: 'x@y.com' })

// update a row
await d1.update('users', user.id, {name: 'Jim Bean'})

// querying
// TODO
```

## Logging with Baselime

In order to use Baselime's request grouping, make a new logger for each request, for instance in `_worker.js` or in your function:

```js
import { BaselimeLogger } from 'flaregun/baselime-logger.js'
import { nanoid } from 'nanoid'

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url)
        req.logger = new BaselimeLogger({
            service: `myservice-${env.ENV}`,
            apiKey: env.BASELIME_API_KEY,
            ctx: ctx,
            requestId: nanoid(),
            namespace: `${req.method} ${url.pathname}`,
        })
        const startTime = Date.now()

        // DO STUFF HERE

        let res = new Response('hello world')
        const duration = Date.now() - startTime
        req.logger.logd("end of request", { duration }) // to use Baselime's duration feature
        ctx.waitUntil(req.logger.flush())
        return res
    },
}
```
