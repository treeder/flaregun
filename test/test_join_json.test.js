import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testJoinJson', async () => {
  let user = {
    name: 'Join JSON User',
    email: 'joinjson@example.com',
  }
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  expect(r.user).toBeDefined()
  let userId = r.user.id

  let post1 = {
    userId: userId,
    title: 'Rated Post',
    content: 'This post has a rating',
    data: {
      rating: 5,
      tags: ['a', 'b'],
    },
  }
  await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: post1 },
  })

  let post2 = {
    userId: userId,
    title: 'Unrated Post',
    content: 'This post has a different rating',
    data: {
      rating: 1,
    },
  }
  await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: post2 },
  })

  // Test join with where on JSON field INSIDE JOIN with implicit prefix
  let q = {
    join: {
      table: 'posts',
      on: ['users.id', '=', 'posts.userId'],
      where: {
        'data.rating': 5,
      },
    },
  }

  let res = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q,
  })

  expect(res.users).toBeDefined()
  let found = res.users.find((u) => (u.user ? u.user.id : u.id) === userId)
  expect(found).toBeDefined()

  // Let's also test the negative case
  let q2 = {
    join: {
      table: 'posts',
      on: ['users.id', '=', 'posts.userId'],
      where: {
        'data.rating': 999,
      },
    },
  }

  let res2 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: q2,
  })
  expect(res2.users).toBeDefined()
  let found2 = res2.users.find((u) => (u.user ? u.user.id : u.id) === userId)
  expect(found2).toBeUndefined()
})
