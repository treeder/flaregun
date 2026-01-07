import { User } from '../../../data/users.js'
import { Post } from '../../../data/posts.js'

export async function onRequestGet(c) {
  let userId = c.params.id

  let { searchParams } = new URL(c.request.url)
  let title = searchParams.get('title')
  let where = []
  if (title) {
    where.push(['title', '=', title])
  }

  // Test join functionality with where clause
  let posts = await c.data.d1.query(Post, {
    join: {
      type: 'INNER',
      table: User,
      on: ['userId', '=', 'id'],
      where: [['id', '=', userId]],
    },
  })
  // console.log('users with filtered posts:', users)
  return Response.json({ posts })
}
