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
      async getWithMetadata(key) {
        return store.has(key) ? { value: store.get(key), metadata: { v: 1 } } : { value: null, metadata: null }
      },
      async put(key, value, options) {
        store.set(key, value)
      },
      async delete(key) {
        store.delete(key)
      },
      async list({ prefix, cursor } = {}) {
        let keys = Array.from(store.keys())
        if (prefix) {
          keys = keys.filter((k) => k.startsWith(prefix))
        }
        return { keys: keys.map((k) => ({ name: k })), list_complete: true }
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

  describe('Scoped KV (prefix support)', () => {
    it('creates a scoped KV and prefixes keys transparently', async () => {
      const mockBinding = createMockKVBinding()
      const rootKV = new KV(mockBinding)
      const userKV = rootKV.scope('user:123')

      expect(userKV.prefix).toBe('user:123:')

      // Write via scoped KV
      await userKV.put('theme', 'dark')
      await userKV.putJSON('flags', { beta: true })

      // Underlying store has prefixed keys
      expect(mockBinding.store.get('user:123:theme')).toBe('dark')
      expect(mockBinding.store.get('user:123:flags')).toBe('{"beta":true}')

      // Read via scoped KV
      expect(await userKV.get('theme')).toBe('dark')
      expect(await userKV.getJSON('flags')).toEqual({ beta: true })

      // getWithMetadata
      const meta = await userKV.getWithMetadata('theme')
      expect(meta.value).toBe('dark')

      // Delete via scoped KV
      await userKV.delete('theme')
      expect(mockBinding.store.has('user:123:theme')).toBe(false)
      expect(await userKV.get('theme')).toBeNull()
    })

    it('handles trailing delimiters properly', () => {
      const mockBinding = createMockKVBinding()
      const rootKV = new KV(mockBinding)

      // Automatically appends delimiter if missing
      const scoped1 = rootKV.scope('user:123')
      expect(scoped1.prefix).toBe('user:123:')

      // Does not duplicate delimiter if already present
      const scoped2 = rootKV.scope('user:123:')
      expect(scoped2.prefix).toBe('user:123:')

      // Custom delimiter string
      const scoped3 = rootKV.scope('user/123', '/')
      expect(scoped3.prefix).toBe('user/123/')

      // Empty delimiter
      const scoped4 = rootKV.scope('prefix_', '')
      expect(scoped4.prefix).toBe('prefix_')

      // Options object with delimiter
      const scoped5 = rootKV.scope('user', { delimiter: '#' })
      expect(scoped5.prefix).toBe('user#')
    })

    it('supports chained / nested scoping', async () => {
      const mockBinding = createMockKVBinding()
      const rootKV = new KV(mockBinding)

      const orgKV = rootKV.scope('org_99')
      expect(orgKV.prefix).toBe('org_99:')

      const userKV = orgKV.scope('user_42')
      expect(userKV.prefix).toBe('org_99:user_42:')

      await userKV.set('role', 'admin')
      expect(mockBinding.store.get('org_99:user_42:role')).toBe('admin')
      expect(await userKV.get('role')).toBe('admin')
    })

    it('unprefixes key names in list() results', async () => {
      const mockBinding = createMockKVBinding()
      const rootKV = new KV(mockBinding)
      const user1 = rootKV.scope('user:1')
      const user2 = rootKV.scope('user:2')

      await user1.set('flag_a', 'true')
      await user1.set('flag_b', 'false')
      await user2.set('flag_c', 'true')
      await rootKV.set('global_setting', 'on')

      // user1 list should only contain user1's keys, with prefixes stripped
      const user1List = await user1.list()
      const user1KeyNames = user1List.keys.map((k) => k.name).sort()
      expect(user1KeyNames).toEqual(['flag_a', 'flag_b'])

      // Scoped list with additional prefix filter
      const filtered = await user1.list({ prefix: 'flag_a' })
      expect(filtered.keys.map((k) => k.name)).toEqual(['flag_a'])

      // Root list should see all raw keys
      const rootList = await rootKV.list()
      expect(rootList.keys.length).toBe(4)
    })

    it('clears only keys within its scope with clear()', async () => {
      const mockBinding = createMockKVBinding()
      const rootKV = new KV(mockBinding)
      const user1 = rootKV.scope('user:1')
      const user2 = rootKV.scope('user:2')

      await user1.set('a', '1')
      await user1.set('b', '2')
      await user2.set('c', '3')
      await rootKV.set('global', '4')

      expect(mockBinding.store.size).toBe(4)

      // Clearing user1 should only delete user1's keys
      await user1.clear()

      expect(mockBinding.store.size).toBe(2)
      expect(await user1.get('a')).toBeNull()
      expect(await user1.get('b')).toBeNull()
      expect(await user2.get('c')).toBe('3')
      expect(await rootKV.get('global')).toBe('4')
    })

    it('allows instantiating KV with options or wrapping another KV', async () => {
      const mockBinding = createMockKVBinding()
      const baseKV = new KV(mockBinding, { prefix: 'app:' })
      expect(baseKV.prefix).toBe('app:')

      const wrappedKV = new KV(baseKV, 'sub:')
      expect(wrappedKV.prefix).toBe('app:sub:')

      await wrappedKV.set('key', 'val')
      expect(mockBinding.store.get('app:sub:key')).toBe('val')
    })
  })
})
