import { User } from '../../../data/users.js'

export async function onRequestPost(c) {
  let input = await c.request.json()
  let users = input.users
  let usersUpdate = []
  for (let user of users) {
    let u = await c.data.d1.updatep(User, user.id, user)
    usersUpdate.push(u.stmt)
  }
  let r = await c.data.d1.batch(usersUpdate)
  return Response.json(r)
}
