import { assert } from 'testkit'

export async function testNulls(c) {
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
  assert(r1.user)

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
  assert(r2.user)

  // Test IS NULL
  let q1 = {
    where: [['age', 'is null']]
  }
  let res1 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q1
  })
  assert(res1.users)
  assert(res1.users.find(u => u.id === r1.user.id), 'Should find user with null age')
  assert(!res1.users.find(u => u.id === r2.user.id), 'Should not find user with age 25')

  // Test IS NOT NULL
  let q2 = {
    where: [['age', 'is not null']]
  }
  let res2 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q2
  })
  assert(res2.users)
  assert(!res2.users.find(u => u.id === r1.user.id), 'Should not find user with null age')
  assert(res2.users.find(u => u.id === r2.user.id), 'Should find user with age 25')
}
