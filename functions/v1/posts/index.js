import { Post } from '../../data/posts.js'

export async function onRequestPost(c) {
  let input = await c.request.json()
  let post = input.post
  await c.data.d1.insert(Post, post)
  return Response.json({ post })
}
