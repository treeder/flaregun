import { assert } from 'testkit'

// We don't have direct access to User/Post classes here easily without importing from relative paths which might be messy if not set up.
// But we can construct the query object that `d1.query` expects.

export async function testLeftJoinNull(tk) {
  // 1. Create a User
  let user = {
    name: 'Left Join User ' + Date.now(),
    email: 'leftjoin' + Date.now() + '@example.com'
  }
  let r = await tk.api.fetch('/v1/users', { method: 'POST', body: { user } })
  assert(r.user.id)
  let userId = r.user.id

  // 2. Query Users with LEFT JOIN Posts.
  // We expect this user to have NO posts.
  // So the 'post' field in the result should be null.

  // The structure of the query object for `d1.query(User, q)`:
  let q = {
    where: { id: userId },
    join: {
      type: 'LEFT',
      table: {
        name: 'posts', // Using string name or object with properties
        // We need to provide the schema if we want `json_object` generation to work.
        // Since we are passing this over the wire to `functions/v1/users/query.js`,
        // we can't pass the Class itself.
        // `d1.js` handles `table` as string or object.
        // If it's an object, it expects `properties` for `jsonObjectCol` to work.
        properties: {
            id: {},
            userId: {},
            title: {},
            content: {},
            createdAt: {},
            updatedAt: {}
        }
      },
      on: ['users.id', '=', 'posts.userId']
    }
  }

  // However, `d1.js` `tableName` method checks `clzOrName.table || toTableName(clzOrName.name)`.
  // And `jsonObjectCol` uses `model.properties`.

  // If I pass the table definition in the `join` object in the JSON payload, it should work
  // IF `d1.js` doesn't strictly expect a Class instance but just an object with `name`/`table` and `properties`.

  // Let's check `d1.js` again.
  // `tableName(clzOrName)`: `if (typeof clzOrName == 'string') return clzOrName`. `return clzOrName.table || toTableName(clzOrName.name)`
  // `jsonObjectCol(model)`: `let tableName = this.tableName(model)`, `let fields = Object.keys(model.properties)`

  // So if I pass:
  /*
    join: {
        type: 'LEFT',
        table: {
            name: 'post', // toTableName('post') -> 'posts'
            properties: { ... }
        },
        on: ...
    }
  */
  // It should work.

  let queryPayload = {
    where: { id: userId },
    join: {
      type: 'LEFT',
      table: {
        name: 'post', // will become 'posts'
        properties: {
            id: {},
            userId: {},
            title: {},
            content: {},
            createdAt: {},
            updatedAt: {}
        }
      },
      on: ['users.id', '=', 'posts.userId']
    }
  }

  let queryRes = await tk.api.fetch('/v1/users/query', { method: 'POST', body: queryPayload })
  assert(queryRes.users)
  assert(queryRes.users.length === 1)

  let resultUser = queryRes.users[0]
  console.log('Left Join Result:', resultUser)

  // Assert that the joined 'post' object is null when no match is found.
  // This is the correct behavior this PR implements.
  assert(resultUser.post === null, "Expected joined 'post' object to be null when no match found")
}
