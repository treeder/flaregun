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

## Logger

In order to use Baselime's request grouping, make a new logger for each request, for instance in `_worker.js` or in your function:

```js
export default {
  async fetch(request, env, ctx) {
    // console.log("fetch:", request.url)
    // console.log("ENV:", env)
    request.logger = new BaselimeLogger({
        service: `thingster-${env.ENV}`,
        // namespace: req.url,
        apiKey: env.BASELIME_API_KEY,
        ctx: ctx,
        isLocalDev: env.IS_LOCAL,
        requestId: nanoid(),
        namespace: request.url,
    })
    request.logger.log("logging something")
    ctx.waitUntil(request.logger.flush())
  }
}
```
