export class KV {
  /**
   *
   * @param {*} kv cloudflare KV binding
   */
  constructor(kv) {
    this.kv = kv
  }

  async putJSON(key, value, options = {}) {
    return await this.kv.put(key, JSON.stringify(value), options)
  }

  async getJSON(key, options = {}) {
    let r = await this.kv.get(key, options)
    if (r) r = JSON.parse(r)
    return r
  }

  async get(key, options = {}) {
    return await this.kv.get(key, options)
  }

  async getWithMetadata(key, options = {}) {
    return await this.kv.getWithMetadata(key, options)
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
    return await this.kv.put(key, value, options)
  }
  async delete(key) {
    return await this.kv.delete(key)
  }

  async list(options = {}) {
    return await this.kv.list(options)
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
