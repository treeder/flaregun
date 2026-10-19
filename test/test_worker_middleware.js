import assert from 'node:assert'
import { createWorker } from '../worker.js'

async function testWorkerMiddleware() {
  const log = []

  const modules = {
    // Root middleware
    './functions/_middleware.js': async () => ({
      onRequest: async (c) => {
        log.push(`root: params=${JSON.stringify(c.params)}`)
        c.data.root = true
        return c.next()
      },
    }),

    // Static subdirectory middleware
    './functions/api/_middleware.js': async () => ({
      onRequest: async (c) => {
        log.push(`api: params=${JSON.stringify(c.params)}`)
        c.data.api = true
        return c.next()
      },
    }),

    // Parameterized subdirectory middleware
    './functions/users/[id]/_middleware.js': async () => ({
      onRequest: async (c) => {
        log.push(`users_id: params=${JSON.stringify(c.params)}`)
        c.data.userId = c.params.id
        return c.next()
      },
    }),

    // Endpoint under parameterized subdirectory
    './functions/users/[id]/profile.js': async () => ({
      onRequest: async (c) => {
        return new Response(
          JSON.stringify({
            data: c.data,
            params: c.params,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      },
    }),

    // Catch-all subdirectory middleware
    './functions/docs/[[slug]]/_middleware.js': async () => ({
      onRequest: async (c) => {
        log.push(`docs_slug: params=${JSON.stringify(c.params)}`)
        return c.next()
      },
    }),

    // Endpoint under catch-all subdirectory
    './functions/docs/[[slug]]/index.js': async () => ({
      onRequest: async (c) => {
        return new Response('docs page')
      },
    }),

    // Multi-parameter nested middleware
    './functions/orgs/[orgId]/projects/[projectId]/_middleware.js': async () => ({
      onRequest: async (c) => {
        log.push(`org_project_mw: params=${JSON.stringify(c.params)}`)
        return c.next()
      },
    }),

    // Multi-parameter endpoint
    './functions/orgs/[orgId]/projects/[projectId]/index.js': async () => ({
      onRequest: async (c) => {
        return new Response(JSON.stringify(c.params), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    }),
  }

  const worker = createWorker({ modules })
  const mockCtx = { waitUntil: () => {} }
  const mockEnv = { ASSETS: { fetch: async () => new Response('ASSETS fallback', { status: 404 }) } }

  // Test 1: GET /users/42/profile
  log.length = 0
  const req1 = new Request('http://localhost/users/42/profile')
  const res1 = await worker.fetch(req1, mockEnv, mockCtx)
  const body1 = await res1.json()

  assert.strictEqual(res1.status, 200)
  assert.deepStrictEqual(log, [
    'root: params={"id":"42"}',
    'users_id: params={"id":"42"}',
  ])
  assert.strictEqual(body1.data.root, true)
  assert.strictEqual(body1.data.userId, '42')
  assert.strictEqual(body1.params.id, '42')

  // Test 2: GET /api/users
  log.length = 0
  const req2 = new Request('http://localhost/api/users')
  const res2 = await worker.fetch(req2, mockEnv, mockCtx)

  assert.deepStrictEqual(log, [
    'root: params={}',
    'api: params={}',
  ])

  // Test 3: GET /docs/guides/intro
  log.length = 0
  const req3 = new Request('http://localhost/docs/guides/intro')
  const res3 = await worker.fetch(req3, mockEnv, mockCtx)
  const text3 = await res3.text()

  assert.strictEqual(res3.status, 200)
  assert.strictEqual(text3, 'docs page')
  assert.deepStrictEqual(log, [
    'root: params={"slug":["guides","intro"]}',
    'docs_slug: params={"slug":["guides","intro"]}',
  ])

  // Test 4: GET /orgs/acme/projects/proj-101
  log.length = 0
  const req4 = new Request('http://localhost/orgs/acme/projects/proj-101')
  const res4 = await worker.fetch(req4, mockEnv, mockCtx)
  const body4 = await res4.json()

  assert.strictEqual(res4.status, 200)
  assert.deepStrictEqual(log, [
    'root: params={"orgId":"acme","projectId":"proj-101"}',
    'org_project_mw: params={"orgId":"acme","projectId":"proj-101"}',
  ])
  // Test 5: Client errors (400-499) do not log to console.error
  let errorLogged = false
  const originalError = console.error
  console.error = () => {
    errorLogged = true
  }
  const errorTestModules = {
    './functions/_middleware.js': async () => ({
      onRequest: async (c) => {
        try {
          return await c.next()
        } catch (err) {
          return new Response(err.message, { status: err.status || 500 })
        }
      },
    }),
    './functions/test-401.js': async () => ({
      onRequest: async () => {
        const err = new Error('Unauthorized')
        err.status = 401
        throw err
      },
    }),
    './functions/test-500.js': async () => ({
      onRequest: async () => {
        const err = new Error('Database crash')
        err.status = 500
        throw err
      },
    }),
  }
  const errorWorker = createWorker({ modules: errorTestModules })

  const res401 = await errorWorker.fetch(new Request('http://localhost/test-401'), mockEnv, mockCtx)
  assert.strictEqual(res401.status, 401)
  assert.strictEqual(errorLogged, false, 'Expected 401 error not to be logged to console.error')

  // Test 6: Server errors (>= 500) DO log to console.error
  const res500 = await errorWorker.fetch(new Request('http://localhost/test-500'), mockEnv, mockCtx)
  console.error = originalError
  assert.strictEqual(res500.status, 500)
  assert.strictEqual(errorLogged, true, 'Expected 500 error to be logged to console.error')

  // Test 7: ctx and ctx.exports are exposed on c in fetch, queue, and scheduled
  const mockExports = { Sandbox: { idFromName: () => 'do-id' } }
  const ctxWithExports = {
    exports: mockExports,
    waitUntil: () => {},
    passThroughOnException: () => {},
  }
  let queueCtxCaptured = null
  let scheduledCtxCaptured = null
  const exportsWorker = createWorker({
    modules: {
      './functions/exports-check.js': async () => ({
        onRequest: async (c) => {
          return new Response(
            JSON.stringify({
              hasCtx: c.ctx === ctxWithExports,
              hasExports: c.exports === mockExports,
              hasSandbox: typeof c.exports?.Sandbox?.idFromName === 'function',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        },
      }),
      './functions/queue.js': async () => ({
        queue: async (c) => {
          queueCtxCaptured = c
        },
      }),
      './functions/scheduled.js': async () => ({
        scheduled: async (c) => {
          scheduledCtxCaptured = c
        },
      }),
    },
  })

  const resExports = await exportsWorker.fetch(new Request('http://localhost/exports-check'), mockEnv, ctxWithExports)
  const exportsBody = await resExports.json()
  assert.deepStrictEqual(exportsBody, {
    hasCtx: true,
    hasExports: true,
    hasSandbox: true,
  })

  await exportsWorker.queue({ messages: [] }, mockEnv, ctxWithExports)
  assert.strictEqual(queueCtxCaptured?.ctx, ctxWithExports)
  assert.strictEqual(queueCtxCaptured?.exports, mockExports)

  await exportsWorker.scheduled({ cron: '* * * * *' }, mockEnv, ctxWithExports)
  assert.strictEqual(scheduledCtxCaptured?.ctx, ctxWithExports)
  assert.strictEqual(scheduledCtxCaptured?.exports, mockExports)

  console.log('All middleware unit tests passed successfully!')
}

testWorkerMiddleware().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
