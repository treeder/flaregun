import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testJoinWhere', async () => {
  let user = {
    name: 'Join User 2',
    email: 'join2@example.com',
  }
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  expect(r.user).toBeDefined()
  let userId = r.user.id

  let post1 = {
    userId: userId,
    title: 'Wanted Post',
    content: 'This is the post we want',
  }
  await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: post1 },
  })

  let post2 = {
    userId: userId,
    title: 'Unwanted Post',
    content: 'This is the post we do not want',
  }
  await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: post2 },
  })

  // Test join with where
  // We filter for 'Wanted Post'
  let r3 = await c.api.fetch(`/v1/posts?title=Wanted%20Post`)
  console.log('Filtered Join Result:', r3)
  expect(r3.posts).toBeDefined()

  let found = r3.posts.find((u) => u.user.id === userId && u.post.title === 'Wanted Post')
  expect(found).toBeDefined()

  let notFound = r3.posts.find((u) => u.user.id === userId && u.post.title === 'Unwanted Post')
  expect(notFound).toBeUndefined()
})
