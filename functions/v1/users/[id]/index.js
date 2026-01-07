import { User } from '../../../data/users.js'

export async function onRequestGet(c) {
  let userId = c.params.id
  let user = await c.data.d1.get(User, userId)
  return Response.json({ user })
}
export async function onRequestPost(c) {
  let userId = c.params.id
  let input = await c.request.json()
  let user = input.user
  await c.data.d1.update(User, userId, user)
  return Response.json({ user })
}
