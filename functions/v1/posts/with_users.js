import { User } from '../../data/users.js'
import { Post } from '../../data/posts.js'

export async function onRequest(c) {
  // Test join functionality
  // We want to fetch users and join their posts
  let posts = await c.data.d1.query(Post, {
    join: {
      type: 'INNER', // can use 'LEFT' too
      table: User,
      on: ['userId', '=', 'id'],
    },
  })
  console.log('posts with users:', posts)
  return Response.json({ users: posts })
}
