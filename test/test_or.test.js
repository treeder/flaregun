import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testOr', async () => {
  // Create three users
  const usersToCreate = [
    { name: 'Or User 1', email: 'or1@example.com' },
    { name: 'Or User 2', email: 'or2@example.com' },
    { name: 'Or User 3', email: 'or3@example.com' },
  ]

  const userIds = await Promise.all(
    usersToCreate.map(async (user) => {
      const r = await c.api.fetch(`/v1/users`, {
        method: 'POST',
        body: { user },
      })
      expect(r.user).toBeDefined()
      return r.user.id
    }),
  )
  const [id1, id2, id3] = userIds

  // Query with OR
  let q = {
    where: [[['name', '=', 'Or User 1'], 'OR', ['name', '=', 'Or User 2']]],
  }

  let r = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q,
  })
  expect(r.users).toBeDefined()
  
  let found1 = r.users.find((u) => u.id === id1)
  let found2 = r.users.find((u) => u.id === id2)
  let found3 = r.users.find((u) => u.id === id3)

  expect(found1).toBeDefined()
  expect(found2).toBeDefined()
  expect(found3).toBeUndefined()
})
