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
  let originalData = r.user.data

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

  // The current implementation uses POST to /v1/users/:id for updates
  r = await c.api.fetch(`/v1/users/${userId}`, {
    method: 'POST', // Using POST as that's what the handler expects for update
    body: { user: patch },
  })

  assert(r.user)
  // Fetch fresh to be sure
  r = await c.api.fetch(`/v1/users/${userId}`)
  let updatedUser = r.user

  // Verify merge patch behavior (RFC 7396)
  assert(updatedUser.data.foo === 'updated', 'foo should be updated')
  assert(updatedUser.data.baz === 'qux', 'baz should be added')
  assert(updatedUser.data.nested.a === 3, 'nested.a should be updated')
  // In RFC 7396, keys not in patch should be preserved?
  // Wait, RFC 7396 is recursive merge.
  // SQLite json_patch is RFC 7396.
  // If I patch { "nested": { "a": 3 } }, does it specific replace "nested" with { "a": 3 } or merge into it?
  // standard RFC 7396 says: if target is object and patch is object, merge members.
  // So nested.b should be preserved.
  assert(updatedUser.data.nested.b === 2, 'nested.b should be preserved')

  // verify null deletion
  // RFC 7396: null value in patch deletes the key
  patch = {
    data: {
      baz: null,
    },
  }
  r = await c.api.fetch(`/v1/users/${userId}`, {
    method: 'POST',
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
  let originalData2 = r.user.data
  patch = {
    name: 'Patch User Patched ' + nanoid(),
  }
  r = await c.api.fetch(`/v1/users/${userId2}`, {
    method: 'POST',
    body: { user: patch },
  })
  r = await c.api.fetch(`/v1/users/${userId2}`)
  updatedUser = r.user
  console.log('updatedUser:', updatedUser)
  assert(updatedUser.name === patch.name, 'name should be updated')
  assert(updatedUser.data.foo === 'bar', 'foo should be preserved')
}
