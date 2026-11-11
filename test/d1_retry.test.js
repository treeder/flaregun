import { describe, it, expect } from 'vitest'
import { D1 } from '../d1.js'
import { isVulnerabilityScanPath } from '../worker.js'

describe('D1 transient error retry', () => {
  it('retries D1_ERROR: internal error and D1 DB is overloaded', async () => {
    let attempts = 0
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => {
            attempts++
            if (attempts === 1) {
              throw new Error('D1_ERROR: internal error; reference = abc123')
            }
            if (attempts === 2) {
              throw new Error('D1_ERROR: D1 DB is overloaded. Requests queued for too long.')
            }
            return { id: 'u1', name: 'Alice' }
          },
        }),
      }),
    }
    const d1 = new D1(mockDb)
    const row = await d1.get('users', 'u1')
    expect(attempts).toBe(3)
    expect(row).toEqual({ id: 'u1', name: 'Alice' })
  })

  it('does not retry non-transient SQL errors', async () => {
    let attempts = 0
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => {
            attempts++
            throw new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed')
          },
        }),
      }),
    }
    const d1 = new D1(mockDb)
    await expect(d1.get('users', 'u1')).rejects.toThrow('UNIQUE constraint failed')
    expect(attempts).toBe(1)
  })
})

describe('isVulnerabilityScanPath', () => {
  it('blocks common scanner paths while allowing normal routes and Vite dev paths', () => {
    expect(isVulnerabilityScanPath('/.git/HEAD')).toBe(true)
    expect(isVulnerabilityScanPath('/main/.env')).toBe(true)
    expect(isVulnerabilityScanPath('/wp-admin/install.php')).toBe(true)
    expect(isVulnerabilityScanPath('/_profiler/phpinfo')).toBe(true)
    expect(isVulnerabilityScanPath('/..%2fetc/passwd', 'https://example.com/..%2fetc/passwd')).toBe(true)

    expect(isVulnerabilityScanPath('/')).toBe(false)
    expect(isVulnerabilityScanPath('/v1/users/me')).toBe(false)
    expect(isVulnerabilityScanPath('/node_modules/.vite/deps/chunk.js')).toBe(false)
    expect(isVulnerabilityScanPath('/@vite/client')).toBe(false)
  })
})
