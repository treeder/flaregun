import { assert } from 'testkit'

export async function testBatch(c) {
  let user1 = {
    name: 'Batch User 1',
    email: 'batch1@example.com',
  }
  let user2 = {
    name: 'Batch User 2',
    email: 'batch2@example.com',
  }
  let r1 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user1 },
  })
  user1 = r1.user
  let r2 = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: user2 },
  })
  user2 = r2.user
  
  user1.name = 'Rebatch User 1'
  user2.name = 'Rebatch User 2'
  let rb = await c.api.fetch(`/v1/users/batch`, {
    method: 'POST',
    body: { users: [user1, user2] },
  })

  r1 = await c.api.fetch(`/v1/users/${user1.id}`)
  r2 = await c.api.fetch(`/v1/users/${user2.id}`)
  assert(r1.user.name == 'Rebatch User 1')
  assert(r2.user.name == 'Rebatch User 2')
}
