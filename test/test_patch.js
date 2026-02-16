import { assert } from 'testkit'
import { nanoid } from 'nanoid'

export async function testPatch(c) {
  let user = {
    name: 'Patch User ' + nanoid(),
    email: 'patch@user.com' + nanoid(),
    data: {
      foo: 'bar',
      nested: {
        a: 1,
        b: 2,
      },
    },
  }

  // Create user
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  assert(r.user)
  assert(r.user.id)
  let userId = r.user.id

  // Patch user with partial data
  // We want to update data.foo and add data.baz, but keep data.nested
  // Also update data.nested.a
  let patch = {
    data: {
      foo: 'updated',
      baz: 'qux',
      nested: {
        a: 3,
      },
    },
  }

  r = await c.api.fetch(`/v1/users/${userId}`, {
    method: 'PATCH',
    body: { user: patch },
  })

  assert(r.user)
  // Fetch fresh to be sure
  r = await c.api.fetch(`/v1/users/${userId}`)
  let updatedUser = r.user

  assert(updatedUser.data.foo === 'updated', 'foo should be updated')
  assert(updatedUser.data.baz === 'qux', 'baz should be added')
  assert(updatedUser.data.nested.a === 3, 'nested.a should be updated')
  assert(updatedUser.data.nested.b === 2, 'nested.b should be preserved')

  patch = {
    data: {
      baz: null,
    },
  }
  r = await c.api.fetch(`/v1/users/${userId}`, {
    method: 'PATCH',
    body: { user: patch },
  })
  r = await c.api.fetch(`/v1/users/${userId}`)
  updatedUser = r.user
  assert(updatedUser.data.baz === undefined, 'baz should be deleted')

  // also test if not data existed
  let user2 = {
    name: 'Patch User ' + nanoid(),
    email: 'patch@user.com' + nanoid(),
    data: {
      foo: 'bar',
    },
  }
  r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user2 },
  })
  assert(r.user)
  assert(r.user.id)
  let userId2 = r.user.id
  patch = {
    name: 'Patch User Patched ' + nanoid(),
  }
  r = await c.api.fetch(`/v1/users/${userId2}`, {
    method: 'PATCH',
    body: { user: patch },
  })
  r = await c.api.fetch(`/v1/users/${userId2}`)
  updatedUser = r.user
  assert(updatedUser.name === patch.name, 'name should be updated')
  assert(updatedUser.data.foo === 'bar', 'foo should be preserved')
}
