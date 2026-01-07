import { User } from '../../data/users.js'

export async function onRequestGet(c) {
  let users = await c.data.d1.query(User)
  return Response.json({ users })
}

export async function onRequestPost(c) {
  let input = await c.request.json()
  let user = input.user
  await c.data.d1.insert(User, user)
  return Response.json({ user })
}
