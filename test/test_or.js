import { assert } from 'testkit'

export async function testOr(c) {
  // Create two users
  let u1 = {
    name: 'Or User 1',
    email: 'or1@example.com',
  }
  let r1 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: u1 },
  })
  assert(r1.user)
  let id1 = r1.user.id

  let u2 = {
    name: 'Or User 2',
    email: 'or2@example.com',
  }
  let r2 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: u2 },
  })
  assert(r2.user)
  let id2 = r2.user.id

  let u3 = {
    name: 'Or User 3',
    email: 'or3@example.com',
  }
  let r3 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: u3 },
  })
  assert(r3.user)
  let id3 = r3.user.id

  // Query with OR
  // We want to find user 1 or user 2
  // query structure: { where: [['name', '=', 'Or User 1'], 'OR', ['name', '=', 'Or User 2']] }
  let q = {
    where: [[['name', '=', 'Or User 1'], 'OR', ['name', '=', 'Or User 2']]],
  }

  let r = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q,
  })
  assert(r.users)
  // There might be other users in the DB from other tests, so we check if our specific users are there.
  let found1 = r.users.find((u) => u.id === id1)
  let found2 = r.users.find((u) => u.id === id2)
  let found3 = r.users.find((u) => u.id === id3)

  assert(found1, 'User 1 not found in OR query')
  assert(found2, 'User 2 not found in OR query')
  assert(!found3, 'User 3 found in OR query but should not be')
}
