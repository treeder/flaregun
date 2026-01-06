import { assert } from 'testkit'

export async function testJoin(c) {
  let user = {
    name: 'Join User',
    email: 'join@example.com',
  }
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  assert(r.user)
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
  assert(r2.post)

  // Test join
  let r3 = await c.api.fetch(`/v1/users/with_posts`)
  console.log('Join Result:', r3)
  assert(r3.users)
  // With the new structure, we expect an object like { user: { ... }, post: { ... } }
  // So we need to find the element where u.user.id === userId
  let joinedUser = r3.users.find(u => u.user.id === userId)
  assert(joinedUser, 'Joined user not found')
  assert(joinedUser.user.name === 'Join User', 'User name mismatch')
  assert(joinedUser.post.title === 'Join Post', 'Join failed: post title mismatch')
}
