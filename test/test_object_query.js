import { assert } from 'testkit'

export async function testObjectQuery(c) {
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
  assert(r1.user)

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
  assert(r2.user)

  // Test object query with dot notation and null
  // This is the failing case we want to support
  let q1 = {
    where: { 'data.migratedToUserId': null }
  }

  // Currently this will likely fail or return empty because it doesn't handle dot notation or null correctly in object syntax
  try {
    let res1 = await c.api.fetch(`/v1/users/query`, {
      method: 'POST',
      body: q1
    })

    // If it works, it should return user1 but not user2
    assert(res1.users)
    assert(res1.users.find(u => u.id === r1.user.id), 'Should find user with null migratedToUserId')
    assert(!res1.users.find(u => u.id === r2.user.id), 'Should not find user with value in migratedToUserId')
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
  assert(res2.users)
  assert(res2.users.find(u => u.id === r1.user.id), 'Should find user with someValue=abc')
  assert(!res2.users.find(u => u.id === r2.user.id), 'Should not find user with someValue=def')
}
