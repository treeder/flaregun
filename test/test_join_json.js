import { assert } from 'testkit'

export async function testJoinJson(c) {
  let user = {
    name: 'Join JSON User',
    email: 'joinjson@example.com',
  }
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  assert(r.user)
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

  assert(res.users)
  // Should find the user because they have a post with rating 5
  // Note: Since we use join with string table name for posts, we might only get user object back in a wrapper
  // e.g. { user: {...} }
  let found = res.users.find((u) => (u.user ? u.user.id : u.id) === userId)
  assert(found, 'Should find the user with the rated post (rating 5)')

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
  assert(res2.users)
  let found2 = res2.users.find((u) => (u.user ? u.user.id : u.id) === userId)
  assert(!found2, 'Should NOT find the user with rating 999')
}
