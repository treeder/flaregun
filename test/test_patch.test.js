import { test, expect } from 'vitest'
import { c } from './helper.js'
import { nanoid } from 'nanoid'

test('testPatch', async () => {
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
  expect(r.user).toBeDefined()
  expect(r.user.id).toBeDefined()
  let userId = r.user.id

  // Patch user with partial data
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

  expect(r.user).toBeDefined()
  // Fetch fresh to be sure
  r = await c.api.fetch(`/v1/users/${userId}`)
  let updatedUser = r.user

  expect(updatedUser.data.foo).toBe('updated')
  expect(updatedUser.data.baz).toBe('qux')
  expect(updatedUser.data.nested.a).toBe(3)
  expect(updatedUser.data.nested.b).toBe(2)

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
  expect(updatedUser.data.baz).toBeUndefined()

  // also test if no data existed
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
  expect(r.user).toBeDefined()
  expect(r.user.id).toBeDefined()
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
  expect(updatedUser.name).toBe(patch.name)
  expect(updatedUser.data.foo).toBe('bar')
})
