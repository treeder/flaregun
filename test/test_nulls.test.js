import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testNulls', async () => {
  // Create a user with age = null (default)
  let user1 = {
    name: 'Null Age User',
    email: 'nullage@example.com',
    age: null
  }
  let r1 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user1 },
  })
  expect(r1.user).toBeDefined()

  // Create a user with age = 25
  let user2 = {
    name: 'Age 25 User',
    email: 'age25@example.com',
    age: 25
  }
  let r2 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user2 },
  })
  expect(r2.user).toBeDefined()

  // Test IS NULL
  let q1 = {
    where: [['age', 'is null']]
  }
  let res1 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q1
  })
  expect(res1.users).toBeDefined()
  expect(res1.users.find(u => u.id === r1.user.id)).toBeDefined()
  expect(res1.users.find(u => u.id === r2.user.id)).toBeUndefined()

  // Test IS NOT NULL
  let q2 = {
    where: [['age', 'is not null']]
  }
  let res2 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q2
  })
  expect(res2.users).toBeDefined()
  expect(res2.users.find(u => u.id === r1.user.id)).toBeUndefined()
  expect(res2.users.find(u => u.id === r2.user.id)).toBeDefined()
})
