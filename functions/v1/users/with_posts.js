import { User } from '../../data/users.js'
import { Post } from '../../data/posts.js'

export async function onRequest(c) {
  // Test join functionality
  // We want to fetch users and join their posts
  let users = await c.data.d1.query(User, {
    join: {
      type: 'LEFT',
      table: Post,
      on: 'users.id = posts.userId'
    }
  })
  return Response.json({ users })
}
