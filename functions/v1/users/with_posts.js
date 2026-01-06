import { User } from '../../data/users.js'
import { Post } from '../../data/posts.js'

export async function onRequest(c) {
  // Test join functionality
  // We want to fetch users and join their posts
  let users = await c.data.d1.query(User, {
    columns: ['users.*', 'posts.title as postTitle'],
    join: {
      type: 'LEFT',
      table: 'posts',
      on: 'users.id = posts.userId'
    }
  })
  return Response.json({ users })
}
