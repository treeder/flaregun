import { test, expect } from 'vitest'
import { c } from './helper.js'

test('test multiple order clauses', async () => {
  const timestamp = Date.now()
  const usersToCreate = [
    { name: `OrderUser B_${timestamp}`, email: `order_b1_${timestamp}@example.com`, data: { priority: 2 } },
    { name: `OrderUser A_${timestamp}`, email: `order_a1_${timestamp}@example.com`, data: { priority: 1 } },
    { name: `OrderUser B_${timestamp}`, email: `order_b2_${timestamp}@example.com`, data: { priority: 1 } },
    { name: `OrderUser A_${timestamp}`, email: `order_a2_${timestamp}@example.com`, data: { priority: 2 } },
  ]

  for (const user of usersToCreate) {
    const r = await c.api.fetch(`/v1/users`, {
      method: 'POST',
      body: { user },
    })
    expect(r.user).toBeDefined()
  }

  // 1. Test multiple order array: name asc, email desc
  let r1 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: {
      where: [['email', 'LIKE', `order_%_${timestamp}@example.com`]],
      order: [
        ['name', 'asc'],
        ['email', 'desc'],
      ],
    },
  })
  expect(r1.users).toBeDefined()
  expect(r1.users.length).toBe(4)
  expect(r1.users[0].email).toBe(`order_a2_${timestamp}@example.com`)
  expect(r1.users[1].email).toBe(`order_a1_${timestamp}@example.com`)
  expect(r1.users[2].email).toBe(`order_b2_${timestamp}@example.com`)
  expect(r1.users[3].email).toBe(`order_b1_${timestamp}@example.com`)

  // 2. Test single order array (legacy backward compatibility): email desc
  let r2 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: {
      where: [['email', 'LIKE', `order_%_${timestamp}@example.com`]],
      order: ['email', 'desc'],
    },
  })
  expect(r2.users).toBeDefined()
  expect(r2.users.length).toBe(4)
  expect(r2.users[0].email).toBe(`order_b2_${timestamp}@example.com`)
  expect(r2.users[1].email).toBe(`order_b1_${timestamp}@example.com`)
  expect(r2.users[2].email).toBe(`order_a2_${timestamp}@example.com`)
  expect(r2.users[3].email).toBe(`order_a1_${timestamp}@example.com`)

  // 3. Test object order: { name: 'asc', email: 'asc' }
  let r3 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: {
      where: [['email', 'LIKE', `order_%_${timestamp}@example.com`]],
      order: { name: 'asc', email: 'asc' },
    },
  })
  expect(r3.users).toBeDefined()
  expect(r3.users.length).toBe(4)
  expect(r3.users[0].email).toBe(`order_a1_${timestamp}@example.com`)
  expect(r3.users[1].email).toBe(`order_a2_${timestamp}@example.com`)
  expect(r3.users[2].email).toBe(`order_b1_${timestamp}@example.com`)
  expect(r3.users[3].email).toBe(`order_b2_${timestamp}@example.com`)

  // 4. Test json path ordering with multiple clauses
  let r4 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: {
      where: [['email', 'LIKE', `order_%_${timestamp}@example.com`]],
      order: [
        ['data.priority', 'asc'],
        ['name', 'desc'],
      ],
    },
  })
  // 5. Test unary + prefix ordering with table qualifier and without
  let r5 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: {
      where: [['email', 'LIKE', `order_%_${timestamp}@example.com`]],
      order: ['+users.name', 'asc'],
    },
  })
  expect(r5.users).toBeDefined()
  expect(r5.users.length).toBe(4)
  expect(r5.users[0].email).toBe(`order_a1_${timestamp}@example.com`)
  expect(r5.users[1].email).toBe(`order_a2_${timestamp}@example.com`)

  // 6. Test expression with parentheses
  let r6 = await c.api.fetch(`/v1/users/query`, {
    method: 'POST',
    body: {
      where: [['email', 'LIKE', `order_%_${timestamp}@example.com`]],
      order: ['(+users.name)', 'asc'],
    },
  })
  expect(r6.users).toBeDefined()
  expect(r6.users.length).toBe(4)
  expect(r6.users[0].email).toBe(`order_a1_${timestamp}@example.com`)
  expect(r6.users[1].email).toBe(`order_a2_${timestamp}@example.com`)
})

test('test processCol with unary operators', async () => {
  const { D1 } = await import('../d1.js')
  const d1 = new D1({})

  // Qualified table with unary +
  expect(d1.processCol('+threads.showAt', ['threads'], 'threads')).toBe('+threads.showAt')
  // Unqualified column with unary + and prefix
  expect(d1.processCol('+showAt', ['threads'], 'threads')).toBe('+threads.showAt')
  // Qualified table with unary -
  expect(d1.processCol('-threads.showAt', ['threads'], 'threads')).toBe('-threads.showAt')
  // Parenthesized expression
  expect(d1.processCol('(+threads.showAt)', ['threads'], 'threads')).toBe('(+threads.showAt)')
  // JSON subfield with unary +
  expect(d1.processCol('+data.priority', ['users'], 'users')).toBe("+json_extract(users.data, '$.priority')")
})
