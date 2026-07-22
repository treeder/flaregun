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
  assert.deepStrictEqual(body4, { orgId: 'acme', projectId: 'proj-101' })

  console.log('All middleware unit tests passed successfully!')
}

testWorkerMiddleware().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
