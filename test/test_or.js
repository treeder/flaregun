import { assert } from 'testkit'

export async function testOr(c) {
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
      assert(r.user)
      return r.user.id
    }),
  )
  const [id1, id2, id3] = userIds

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
