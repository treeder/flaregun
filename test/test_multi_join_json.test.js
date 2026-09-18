import { test, expect } from 'vitest'
import { D1 } from '../d1.js'
import { c } from './helper.js'

test('D1.parseResults handles multi-table joins and parses nested model and JSON properties', () => {
  const d1 = new D1({})

  // Define Thread, ThreadUser, Opportunity models mimicking production schema
  class Thread {
    static table = 'threads'
    static properties = {
      id: { type: String, primaryKey: true },
      createdAt: { type: Date },
      opportunityId: { type: String },
      userIds: { type: Array },
      data: { type: Object },
    }
  }

  class ThreadUser {
    static table = 'threadUsers'
    static properties = {
      id: { type: String, primaryKey: true },
      createdAt: { type: Date },
      threadId: { type: String },
      userId: { type: String },
      data: { type: Object },
    }
  }

  class Opportunity {
    static table = 'opportunities'
    static properties = {
      id: { type: String, primaryKey: true },
      createdAt: { type: Date },
      classifications: { type: Object },
      deliverables: { type: Array },
      data: { type: Object },
    }
  }

  const queryOptions = {
    join: [
      { table: ThreadUser, on: ['id', '=', 'threadId'] },
      { table: Opportunity, on: ['opportunityId', '=', 'id'] },
    ],
  }

  // Raw rows as returned by SQLite json_object() aggregation
  const mockResults = [
    {
      thread: JSON.stringify({
        id: 'thread_1',
        createdAt: '2026-09-18T10:00:00.000Z',
        opportunityId: 'opp_1',
        userIds: JSON.stringify(['user_1', 'user_2']),
        data: JSON.stringify({ isRead: false, subject: 'Collaboration' }),
      }),
      threadUser: JSON.stringify({
        id: 'tu_1',
        createdAt: '2026-09-18T10:00:00.000Z',
        threadId: 'thread_1',
        userId: 'user_1',
        data: JSON.stringify({ pinned: true }),
      }),
      opportunity: JSON.stringify({
        id: 'opp_1',
        createdAt: '2026-09-18T09:00:00.000Z',
        classifications: JSON.stringify({ category: 'tech', tier: 'premium' }),
        deliverables: JSON.stringify([{ platform: 'instagram', type: 'reel' }]),
        data: JSON.stringify({ budget: 5000, unmodeledExtra: { foo: 'bar' } }),
      }),
    },
    // Second row: LEFT JOIN where opportunity is null
    {
      thread: JSON.stringify({
        id: 'thread_2',
        createdAt: '2026-09-18T11:00:00.000Z',
        opportunityId: null,
        userIds: JSON.stringify(['user_3']),
        data: JSON.stringify({ isRead: true }),
      }),
      threadUser: JSON.stringify({
        id: 'tu_2',
        createdAt: '2026-09-18T11:00:00.000Z',
        threadId: 'thread_2',
        userId: 'user_3',
        data: JSON.stringify({ pinned: false }),
      }),
      opportunity: null,
    },
  ]

  d1.parseResults(Thread, queryOptions, mockResults)

  const row1 = mockResults[0]
  // Verify Thread
  expect(typeof row1.thread).toBe('object')
  expect(row1.thread.createdAt).toBeInstanceOf(Date)
  expect(Array.isArray(row1.thread.userIds)).toBe(true)
  expect(row1.thread.userIds).toEqual(['user_1', 'user_2'])
  expect(typeof row1.thread.data).toBe('object')
  expect(row1.thread.data.isRead).toBe(false)
  expect(row1.thread.data.subject).toBe('Collaboration')

  // Verify ThreadUser
  expect(typeof row1.threadUser).toBe('object')
  expect(row1.threadUser.createdAt).toBeInstanceOf(Date)
  expect(typeof row1.threadUser.data).toBe('object')
  expect(row1.threadUser.data.pinned).toBe(true)

  // Verify Opportunity
  expect(typeof row1.opportunity).toBe('object')
  expect(row1.opportunity.createdAt).toBeInstanceOf(Date)
  expect(typeof row1.opportunity.classifications).toBe('object')
  expect(row1.opportunity.classifications.category).toBe('tech')
  expect(Array.isArray(row1.opportunity.deliverables)).toBe(true)
  expect(row1.opportunity.deliverables[0].platform).toBe('instagram')
  expect(typeof row1.opportunity.data).toBe('object')
  expect(row1.opportunity.data.budget).toBe(5000)

  // Verify Row 2 (LEFT JOIN null check)
  const row2 = mockResults[1]
  expect(typeof row2.thread).toBe('object')
  expect(row2.thread.data.isRead).toBe(true)
  expect(row2.opportunity).toBeNull()
})

test('D1.prepStmt supports bare model arrays and infers ON clauses for multi-table joins', () => {
  let executedSql = ''
  let executedBinds = []

  const mockDb = {
    prepare(sql) {
      executedSql = sql
      return {
        bind(...binds) {
          executedBinds = binds
          return this
        },
      }
    },
  }

  const d1 = new D1(mockDb)

  class Thread {
    static table = 'threads'
    static properties = {
      id: { type: String, primaryKey: true },
      opportunityId: { type: String },
      data: { type: Object },
    }
  }

  class ThreadUser {
    static table = 'threadUsers'
    static properties = {
      id: { type: String, primaryKey: true },
      threadId: { type: String },
      data: { type: Object },
    }
  }

  class Opportunity {
    static table = 'opportunities'
    static properties = {
      id: { type: String, primaryKey: true },
      data: { type: Object },
    }
  }

  // Testing shorthand syntax: join: [ThreadUser, Opportunity]
  d1.prepStmt(Thread, { join: [ThreadUser, Opportunity] })

  expect(executedSql).toContain('SELECT CASE WHEN threads.id IS NULL THEN NULL ELSE json_object')
  expect(executedSql).toContain('CASE WHEN threadUsers.id IS NULL THEN NULL ELSE json_object')
  expect(executedSql).toContain('CASE WHEN opportunities.id IS NULL THEN NULL ELSE json_object')
  expect(executedSql).toContain('FROM threads')
  expect(executedSql).toContain('INNER JOIN threadUsers ON threadUsers.threadId = threads.id')
  expect(executedSql).toContain('INNER JOIN opportunities ON threads.opportunityId = opportunities.id')
})

test('D1.parseResults handles custom aliases in joins', () => {
  const d1 = new D1({})

  class User {
    static table = 'users'
    static properties = {
      id: { type: String, primaryKey: true },
      name: { type: String },
      data: { type: Object },
    }
  }

  class Post {
    static table = 'posts'
    static properties = {
      id: { type: String, primaryKey: true },
      authorId: { type: String },
      title: { type: String },
    }
  }

  const queryOptions = {
    join: [
      {
        table: User,
        as: 'author',
        on: ['authorId', '=', 'id'],
      },
    ],
  }

  const mockResults = [
    {
      post: JSON.stringify({ id: 'p1', authorId: 'u1', title: 'Joined Post' }),
      author: JSON.stringify({ id: 'u1', name: 'Author Name', data: JSON.stringify({ level: 'gold' }) }),
    },
  ]

  d1.parseResults(Post, queryOptions, mockResults)

  expect(typeof mockResults[0].author).toBe('object')
  expect(mockResults[0].author.name).toBe('Author Name')
  expect(typeof mockResults[0].author.data).toBe('object')
  expect(mockResults[0].author.data.level).toBe('gold')
})

test('End-to-end: multi-table join parses nested JSON fields from SQLite', async () => {
  const timestamp = Date.now()

  // 1. Create a User with JSON data
  const userPayload = {
    name: `MultiJoin User ${timestamp}`,
    email: `multijoin_${timestamp}@example.com`,
    data: { role: 'creator', tier: 3, preferences: { newsletter: true } },
  }
  const userRes = await c.api.fetch(`/v1/users`, {
    method: 'POST',
    body: { user: userPayload },
  })
  expect(userRes.user).toBeDefined()
  const userId = userRes.user.id

  // 2. Create a Post with JSON data
  const postPayload = {
    userId,
    title: `MultiJoin Post ${timestamp}`,
    content: 'Testing join JSON parsing end to end',
    data: { views: 42, tags: ['javascript', 'd1', 'cloudflare'] },
  }
  const postRes = await c.api.fetch(`/v1/posts`, {
    method: 'POST',
    body: { post: postPayload },
  })
  expect(postRes.post).toBeDefined()
  const postId = postRes.post.id

  // 3. Query via /v1/posts/with_users
  const r = await c.api.fetch(`/v1/posts/with_users`)
  expect(r.users).toBeDefined()

  const match = r.users.find((item) => item.post?.id === postId)
  expect(match).toBeDefined()

  // Verify Post JSON data is parsed as an Object
  expect(typeof match.post.data).toBe('object')
  expect(match.post.data.views).toBe(42)
  expect(match.post.data.tags).toEqual(['javascript', 'd1', 'cloudflare'])

  // Verify User JSON data is parsed as an Object
  expect(typeof match.user.data).toBe('object')
  expect(match.user.data.role).toBe('creator')
  expect(match.user.data.tier).toBe(3)
  expect(match.user.data.preferences.newsletter).toBe(true)
})
