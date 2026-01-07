import { assert } from 'testkit'

export async function testJoinWhere(c) {
  let user = {
    name: 'Join User 2',
    email: 'join2@example.com',
  }
  let r = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user },
  })
  assert(r.user)
  let userId = r.user.id

  let post1 = {
    userId: userId,
    title: 'Wanted Post',
    content: 'This is the post we want'
  }
  await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: post1 }
  })

  let post2 = {
    userId: userId,
    title: 'Unwanted Post',
    content: 'This is the post we do not want'
  }
  await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: post2 }
  })

  // Test join with where
  // We filter for 'Wanted Post'
  let r3 = await c.api.fetch(`/v1/users/with_posts_filtered?postTitle=Wanted%20Post`)
  console.log('Filtered Join Result:', r3)
  assert(r3.users)

  // The structure returned by d1.query with join is an array of objects.
  // [{ user: {...}, post: {title: 'Wanted Post'} }]

  let found = r3.users.find(u => u.user.id === userId && u.post.title === 'Wanted Post')
  assert(found, 'Should find the user with the wanted post')

  // We should NOT find a row with 'Unwanted Post' for this user
  let notFound = r3.users.find(u => u.user.id === userId && u.post.title === 'Unwanted Post')
  assert(!notFound, 'Should not find the user with the unwanted post')
}
