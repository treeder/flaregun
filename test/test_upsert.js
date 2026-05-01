import { assert } from 'testkit'

export async function testUpsert(c) {
  let { api } = c
  // Clean up
  await api.fetch('/v1/users/query', {
    method: 'POST',
    body: { query: 'delete from users' },
  })

  // Upsert a new user
  let user = {
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    data: { foo: 'bar' }
  }

  let r = await api.fetch('/v1/users/upsert', {
    method: 'POST',
    body: { user }
  })
  assert(r.user, 'Expected user back')
  assert(r.user.id === 'u1', 'Expected id u1')
  assert(r.user.name === 'Alice', 'Expected name Alice')

  // Upsert the same user with updated fields
  let userUpdate = {
    id: 'u1',
    name: 'Alice Updated',
    data: { baz: 'qux' }
  }

  let r2 = await api.fetch('/v1/users/upsert', {
    method: 'POST',
    body: { user: userUpdate }
  })
  assert(r2.user, 'Expected user back')

  // Fetch to check
  let r3 = await api.fetch('/v1/users/u1')
  assert(r3.user.name === 'Alice Updated', 'Expected name to update')
  assert(r3.user.email === 'alice@example.com', 'Expected email to remain unchanged')
  assert(r3.user.data.foo === 'bar', 'Expected json_patch to merge object, keeping foo')
  assert(r3.user.data.baz === 'qux', 'Expected json_patch to merge object, adding baz')
}
