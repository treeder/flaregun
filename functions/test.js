import { User } from "./models/user.js"

export async function onRequestGet(c) {
  let user = {
    name: "John Wick",
    email: "john@wick.com",
  }
  await c.data.d1.insert(User.table, user)
  console.log('user:', user)
  user.name = 'John Cena'
  await c.data.d1.update(User.table, user.id, user)
  console.log('user:', user)

  await c.data.d1.update(User.table, user.id, { data: { x: 'y' } })
  console.log('user:', user)

  let users = await c.data.d1.query(User.table, {
    model: User,
  })
  console.log('users:', users)

  return Response.json({ Hello: 'World!' })
}
