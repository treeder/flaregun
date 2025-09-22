/**
 * CloudflareLogger enhances your logging with:
 *
 * * Extra data fields
 * *
 */
export class CloudflareLogger {
  /**
   *
   * @param {object} options
   * @param {object} [options.data] - additional data to send with each log
   */
  constructor(options = {}) {
    this.data = options.data || {}
    this.options = options
  }

  /**
   * This clones the logger so you can add extra data long the way.
   *
   * @param {string} key new data key
   * @param {any} value new data value
   */
  with(key, value) {
    return new CloudflareLogger({ data: { ...this.data, [key]: value } })
  }

  /**
   * Just like console.log
   * 
   * * If last param is an object, it will show up in the logs under a `data` field.
   * * If last param is an error, it will log as an error with all the error details.
   */
  log(...params) {
    let data = { ...this.data, level: 'info' }
    let err = null
    // for (let p of params) {
    //   if (p instanceof Error) {
    //     err = p
    //   }
    // }
    let last = params[params.length - 1]
    if (last instanceof Error) {
      err = last
      params.pop()
    } else if (Array.isArray(last)) {
      data.data = last
      params.pop()
    } else if (this.isPlainObject(last)) {
      // then data object
      if (params.length > 1) {
        data.data = last
      } else {
        data = { ...data, ...last }
      }
      params.pop()
    }
    if (err) {
      data.message = err.message
      data.level = 'error'
      data.error = {
        message: err.message,
        stack: err.stack,
        status: err.status,
        cause: err.cause,
      }
    }
    if (params.length > 0) {
      // already popped
      let m = data.message || ''
      data.message = params
        .map((p) => {
          if (p instanceof Error) {
            return p.message
          }
          if (p instanceof Date) {
            return p.toString()
          }
          if (typeof p == 'object') {
            return JSON.stringify(p)
          }
          return p
        })
        .join(' ')
      data.message += ' ' + m
    }
    if (!data.message) data.message = 'no message'
    if (data.level == 'error') {
      console.error(data)
    } else {
      console.log(data)
    }
  }
  async flush() {}

  isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && value.constructor === Object
  }
}
