import { User } from '../../data/users.js'
import { Post } from '../../data/posts.js'

export async function onRequest(c) {
  const url = new URL(c.request.url);
  const postTitle = url.searchParams.get('postTitle');

  // Test join functionality with where clause
  let users = await c.data.d1.query(User, {
    join: {
      type: 'INNER',
      table: Post,
      on: 'users.id = posts.userId',
      where: [['title', '==', postTitle]]
    },
  })
  // console.log('users with filtered posts:', users)
  return Response.json({ users })
}
