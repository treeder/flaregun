import { User } from '../../data/users.js'

export async function onRequestPost(c) {
  let input = await c.request.json()
  let user = input.user
  let r = await c.data.d1.upsert(User, user)
  return Response.json({ user: r.object })
}
