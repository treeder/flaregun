import { test, expect } from 'vitest'
import { c } from './helper.js'

test('testJoin', async () => {
  let user = {
    name: 'Join User',
    email: 'join@example.com',
  }
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  expect(r.user).toBeDefined()
  let userId = r.user.id

  let post = {
    userId: userId,
    title: 'Join Post',
    content: 'This is a post for testing joins'
  }
  let r2 = await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post }
  })
  expect(r2.post).toBeDefined()

  // Test join
  let r3 = await c.api.fetch(`/v1/posts/with_users`)
  console.log('Join Result:', r3)
  expect(r3.users).toBeDefined()
  
  let joinedUser = r3.users.find(u => u.user.id === userId)
  expect(joinedUser).toBeDefined()
  expect(joinedUser.user.name).toBe('Join User')
  expect(joinedUser.post.title).toBe('Join Post')
})
