import { User } from '../../data/users.js'

export async function onRequestPost(c) {
  let q = await c.request.json()
  // console.log("QUERY:", q)
  let users = await c.data.d1.query(User, q)
  return Response.json({ users })
}
