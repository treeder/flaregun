import { User } from './data/users.js'

export async function onRequestGet(c) {
  let user = {
    name: 'John Wick',
    email: 'john@wick.com',
  }
  await c.data.d1.insert(User.table, user)
  console.log('user:', user)
  user.name = 'John Cena'
  await c.data.d1.update(User.table, user.id, user)
  console.log('user:', user)
  let u2 = await getAndPrint(c, User, user.id)
  console.log('ASSERTING', u2)
  console.assert(u2.name == 'John Cena2', 'name did not update')

  await c.data.d1.update(User.table, user.id, { age: 33 })
  console.log('user:', user)
  await getAndPrint(c, User, user.id)

  await c.data.d1.update(User.table, user.id, { data: { x: 'y' } })
  console.log('user:', user)
  await getAndPrint(c, User, user.id)

  let users = await c.data.d1.query(User.table, {
    model: User,
  })
  console.log('users:', users)

  return Response.json({ hello: 'world!' })
}

export async function getAndPrint(c, model, id) {
  let o = await c.data.d1.get(model, id)
  console.log('got:', o)
  return o
}
