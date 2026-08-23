import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testObjectQuery', async () => {
  // Create a user with nested data
  let user1 = {
    name: 'Object Query User 1',
    email: 'objquery1@example.com',
    data: {
      migratedToUserId: null,
      someValue: 'abc'
    }
  }
  let r1 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user1 },
  })
  expect(r1.user).toBeDefined()

  let user2 = {
    name: 'Object Query User 2',
    email: 'objquery2@example.com',
    data: {
      migratedToUserId: 'user123',
      someValue: 'def'
    }
  }
  let r2 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user2 },
  })
  expect(r2.user).toBeDefined()

  // Test object query with dot notation and null
  let q1 = {
    where: { 'data.migratedToUserId': null }
  }

  try {
    let res1 = await c.api.fetch(`/v1/users/query`, {
      method: 'POST',
      body: q1
    })

    expect(res1.users).toBeDefined()
    expect(res1.users.find(u => u.id === r1.user.id)).toBeDefined()
    expect(res1.users.find(u => u.id === r2.user.id)).toBeUndefined()
    console.log("Test passed (unexpectedly?)")
  } catch (e) {
    console.log("Test failed as expected or with error:", e)
    throw e
  }

  // Test object query with dot notation and value
  let q2 = {
    where: { 'data.someValue': 'abc' }
  }
  let res2 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q2
  })
  expect(res2.users).toBeDefined()
  expect(res2.users.find(u => u.id === r1.user.id)).toBeDefined()
  expect(res2.users.find(u => u.id === r2.user.id)).toBeUndefined()

  // Test object query with Date object
  let q3 = {
    where: { createdAt: new Date(r1.user.createdAt) }
  }
  let res3 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q3
  })
  expect(res3.users).toBeDefined()
})
