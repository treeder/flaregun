export class KV {
  /**
   *
   * @param {*} kv cloudflare KV binding or another KV instance
   * @param {object|string} [options] options object or prefix string
   * @param {string} [options.prefix] prefix string to prepend to all keys
   * @param {string} [options.delimiter] delimiter for scoping (default: ':')
   */
  constructor(kv, options = {}) {
    if (kv instanceof KV) {
      this.kv = kv.kv
      const basePrefix = kv.prefix || ''
      const opts = typeof options === 'string' ? { prefix: options } : options
      this.delimiter = opts.delimiter !== undefined ? opts.delimiter : kv.delimiter
      this.prefix = basePrefix + (opts.prefix || '')
    } else {
      this.kv = kv
      const opts = typeof options === 'string' ? { prefix: options } : options
      this.prefix = opts.prefix || ''
      this.delimiter = opts.delimiter !== undefined ? opts.delimiter : ':'
    }
  }

  /**
   * Returns a new KV instance scoped with the given prefix.
   *
   * @param {string} prefix prefix string to scope by
   * @param {string|object} [options] delimiter string or options object { delimiter }
   * @returns {KV}
   */
  scope(prefix, options = {}) {
    const opts = typeof options === 'string' ? { delimiter: options } : options
    const delimiter = opts.delimiter !== undefined ? opts.delimiter : this.delimiter
    let p = String(prefix || '')
    if (p && delimiter && !p.endsWith(delimiter)) {
      p += delimiter
    }
    const nextPrefix = this.prefix ? `${this.prefix}${p}` : p
    return new KV(this.kv, { prefix: nextPrefix, delimiter })
  }

  _key(key) {
    return this.prefix ? `${this.prefix}${key}` : key
  }

  _unprefixKey(key) {
    if (this.prefix && key.startsWith(this.prefix)) {
      return key.slice(this.prefix.length)
    }
    return key
  }

  async putJSON(key, value, options = {}) {
    return await this.put(key, JSON.stringify(value), options)
  }

  async getJSON(key, options = {}) {
    let r = await this.get(key, options)
    if (r) r = JSON.parse(r)
    return r
  }

  async get(key, options = {}) {
    return await this.kv.get(this._key(key), options)
  }

  async getWithMetadata(key, options = {}) {
    return await this.kv.getWithMetadata(this._key(key), options)
  }

  /**
   *
   * @param {string} key key string
   * @param {string|ReadableStream|ArrayBuffer} value value string
   * @param {object} [options]
   * @param {string} [options.expiration] when to expire in seconds since epoch
   * @param {string} [options.expirationTtl] Ttl in seconds.
   * @param {object} [options.metadata] metadata object to store with the value.
   * @returns
   */
  async put(key, value, options = {}) {
    return await this.kv.put(this._key(key), value, options)
  }

  async delete(key) {
    return await this.kv.delete(this._key(key))
  }

  async list(options = {}) {
    const listOptions = { ...options }
    if (this.prefix) {
      listOptions.prefix = `${this.prefix}${options.prefix || ''}`
    }
    const res = await this.kv.list(listOptions)
    if (this.prefix && res && Array.isArray(res.keys)) {
      return {
        ...res,
        keys: res.keys.map((k) => ({
          ...k,
          name: this._unprefixKey(k.name),
        })),
      }
    }
    return res
  }

  async set(key, value, options = {}) {
    return await this.setItem(key, value, options)
  }

  async getItem(key, options = {}) {
    return await this.get(key, options)
  }

  async setItem(key, value, options = {}) {
    if (
      typeof value !== 'string' &&
      !(value instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(value) &&
      !(typeof ReadableStream !== 'undefined' && value instanceof ReadableStream)
    ) {
      value = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
    }
    return await this.put(key, value, options)
  }

  async removeItem(key) {
    return await this.delete(key)
  }

  async clear() {
    let list = await this.list()
    while (list && list.keys && list.keys.length > 0) {
      await Promise.all(list.keys.map((k) => this.delete(k.name)))
      if (list.list_complete) break
      list = await this.list({ cursor: list.cursor })
    }
  }
}
