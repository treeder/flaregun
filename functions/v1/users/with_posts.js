import { User } from '../../data/users.js'
import { Post } from '../../data/posts.js'

export async function onRequest(c) {
  // Test join functionality
  // We want to fetch users and join their posts
  let users = await c.data.d1.query(User, {
    join: {
      type: 'INNER', // can use 'LEFT' too
      table: Post,
      on: 'users.id = posts.userId',
    },
  })
  console.log('users with posts:', users)
  return Response.json({ users })
}
