# cloudflare

JavaScript utils for Cloudflare dev services. 

## Usage

```sh
npm install treeder/cloudflare-funcs
```

In your workers or pages functions, initialize with the binding:

```js
let d1 = new D1(env.D1)

// then you can use the new functions:
await d1.query(...)
await d1.insert(...)
```

## Logging with Baselime

In order to use Baselime's request grouping, make a new logger for each request, for instance in `_worker.js` or in your function:

```js
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
