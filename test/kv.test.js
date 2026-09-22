import { describe, it, expect } from 'vitest'
import { KV } from '../kv.js'

describe('flaregun KV Storage interface', () => {
  function createMockKVBinding() {
    const store = new Map()
    return {
      store,
      async get(key) {
        return store.has(key) ? store.get(key) : null
      },
      async put(key, value, options) {
        store.set(key, value)
      },
      async delete(key) {
        store.delete(key)
      },
      async list({ cursor } = {}) {
        const keys = Array.from(store.keys()).map((k) => ({ name: k }))
        return { keys, list_complete: true }
      },
    }
  }

  it('implements standard get, put, delete, list', async () => {
    const mockBinding = createMockKVBinding()
    const kv = new KV(mockBinding)

    await kv.put('foo', 'bar')
    expect(await kv.get('foo')).toBe('bar')

    const list = await kv.list()
    expect(list.keys).toEqual([{ name: 'foo' }])

    await kv.delete('foo')
    expect(await kv.get('foo')).toBeNull()
  })

  it('implements putJSON and getJSON', async () => {
    const mockBinding = createMockKVBinding()
    const kv = new KV(mockBinding)

    await kv.putJSON('obj', { a: 1, b: 'two' })
    const res = await kv.getJSON('obj')
    expect(res).toEqual({ a: 1, b: 'two' })
  })

  it('implements Web Storage interface: getItem, setItem, removeItem, clear', async () => {
    const mockBinding = createMockKVBinding()
    const kv = new KV(mockBinding)

    // setItem with string
    await kv.setItem('hello', 'world')
    expect(await kv.getItem('hello')).toBe('world')

    // setItem with boolean (coerced)
    await kv.setItem('boolFlag', true)
    expect(await kv.getItem('boolFlag')).toBe('true')

    // setItem with object (JSON serialized)
    await kv.setItem('jsonKey', { active: true })
    expect(await kv.getItem('jsonKey')).toBe('{"active":true}')

    // removeItem
    await kv.removeItem('hello')
    expect(await kv.getItem('hello')).toBeNull()

    // clear
    expect(mockBinding.store.size).toBe(2)
    await kv.clear()
    expect(mockBinding.store.size).toBe(0)
    expect(await kv.getItem('boolFlag')).toBeNull()
  })

  it('implements KV set alias', async () => {
    const mockBinding = createMockKVBinding()
    const kv = new KV(mockBinding)

    await kv.set('testKey', 'value123')
    expect(await kv.get('testKey')).toBe('value123')
    expect(await kv.getItem('testKey')).toBe('value123')
  })
})
