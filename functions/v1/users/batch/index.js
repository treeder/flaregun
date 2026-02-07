import { User } from '../../../data/users.js'

export async function onRequestPost(c) {
  let input = await c.request.json()
  let users = input.users
  let usersUpdate = []
  for (let user of users) {
    usersUpdate.push(await c.data.d1.updatep(User, user.id, user))
  }
  let r = await c.data.d1.batch(usersUpdate)
  return Response.json(r)
}
