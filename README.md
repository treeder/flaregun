# cloudflare

JavaScript utils for Cloudflare dev services. 

## Install

```sh
npm install treeder/flaregun
```

## D1 features

This handles inserting and updating objects, assigning IDs, nested JSON objects, etc. 

In your workers or pages functions, initialize with the binding:

```js
import { D1 } from 'flaregun'

// D1
let d1 = new D1(env.D1) // just adds some extra functionality to the built in d1 interface, you can still use it just as you normally would too.

// then you can use the new functions
// insert new data
await d1.insert('users', {name: 'Jimbo', email: 'x@y.com'})

// update a row
await d1.update('users', user.id, {name: 'Jim Bean'})

// querying
let users = await d1.query('users', {
    where: [['orgID', '=', orgID], ['createdAt', '>', new Date(Date.now() - 48 * 60 * 60 * 1000)]],
})

// querying JSON data using path notation
let users = await d1.query('users', {
  where: [['data.awesome', '=', true]],
}
```

## Starter kit

Check out [the starter kit](./starter) for a quick start. This will setup everything you need to run a full-stack cloudflare app. 
