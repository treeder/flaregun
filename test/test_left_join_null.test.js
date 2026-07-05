import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testLeftJoinNull', async () => {
  // 1. Create a User
  let user = {
    name: 'Left Join User ' + Date.now(),
    email: 'leftjoin' + Date.now() + '@example.com'
  }
  let r = await c.api.fetch('/v1/users', { method: 'POST', body: { user } })
  expect(r.user.id).toBeDefined()
  let userId = r.user.id

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

  let queryRes = await c.api.fetch('/v1/users/query', { method: 'POST', body: queryPayload })
  expect(queryRes.users).toBeDefined()
  expect(queryRes.users.length).toBe(1)

  let resultUser = queryRes.users[0]
  console.log('Left Join Result:', resultUser)

  expect(resultUser.post).toBeNull()
})
