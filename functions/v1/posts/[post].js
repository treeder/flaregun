import { Post } from '../../data/posts.js'

export async function onRequestGet(c) {
  let postId = c.params.post
  let post = await c.data.d1.get(Post, postId)
  return Response.json({ post })
}
export async function onRequestPost(c) {
  let postId = c.params.post
  let input = await c.request.json()
  let post = input.post
  await c.data.d1.update(Post, postId, post)
  return Response.json({ post })
}
