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
