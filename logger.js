/**
 * CloudflareLogger enhances your logging with:
 *
 * * Extra data fields
 * *
 */
export class CloudflareLogger {
  /**
   *
   * @param {object} opts
   * @param {object} [opts.data] - additional data to send with each log
   */
  constructor(opts = {}) {
    this.data = opts.data || {}
    this.options = opts
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
    this._log('log', params)
  }

  /**
   * Just like console.info
   *
   * * If last param is an object, it will show up in the logs under a `data` field.
   * * If last param is an error, it will log as an error with all the error details.
   */
  info(...params) {
    this._log('info', params)
  }

  /**
   * Just like console.warn
   *
   * * If last param is an object, it will show up in the logs under a `data` field.
   * * If last param is an error, it will log as an error with all the error details.
   */
  warn(...params) {
    this._log('warn', params)
  }

  /**
   * Just like console.error
   *
   * * If last param is an object, it will show up in the logs under a `data` field.
   * * If last param is an error, it will log as an error with all the error details.
   */
  error(...params) {
    this._log('error', params)
  }

  _log(level, params) {
    let data = this.toObject(...params)
    if (level !== 'log') {
      data.level = level
    }
    let method = data.level === 'error' ? 'error' : level
    console[method](data)
  }

  /**
   * This returns the object that will be passed to console.log()
   *
   * @param  {...any} params same params as log()
   */
  toObject(...params) {
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
      data.error = serializeError(err)
      if (err.cause) {
        const causeMsg = formatCauseChain(err.cause, new WeakSet([err]))
        if (causeMsg) {
          if (data.message) {
            data.message += ` (caused by: ${causeMsg})`
          } else {
            data.message = `caused by: ${causeMsg}`
          }
        }
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
      if (m) {
        data.message += ' ' + m
      }
    }
    if (!data.message) data.message = 'no message'
    return data
  }

  async flush() {}

  isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && value.constructor === Object
  }
}

export function serializeError(err, seen = new WeakSet()) {
  if (!err) return null
  if (!(err instanceof Error)) {
    if (typeof err === 'object') return err
    return { message: String(err) }
  }
  if (seen.has(err)) {
    return { name: err.name, message: '[Circular Reference]', stack: err.stack }
  }
  seen.add(err)
  const data = {
    name: err.name,
    message: err.message,
    status: err.status,
    stack: err.stack,
  }
  if (err.cause !== undefined) {
    data.cause = serializeError(err.cause, seen)
  }
  return data
}

function formatCauseChain(cause, seen = new WeakSet()) {
  const messages = []
  let curr = cause
  while (curr) {
    if (typeof curr === 'object' && curr !== null) {
      if (seen.has(curr)) {
        messages.push('[Circular Reference]')
        break
      }
      seen.add(curr)
    }
    if (curr instanceof Error) {
      if (curr.message) messages.push(curr.message)
      curr = curr.cause
    } else if (typeof curr === 'object' && curr.message) {
      messages.push(curr.message)
      curr = curr.cause
    } else {
      messages.push(String(curr))
      break
    }
  }
  return messages.join(': ')
}
