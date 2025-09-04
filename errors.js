import api from 'api'

/**
 *
 */
export class ErrorHandler {
  constructor(opts = {}) {
    this.opts = opts
  }

  async handle(c, err) {
    console.log({
      name: err.name,
      message: err.message,
      stack: err.stack,
    })
    await this.doPost(c, err)
    return Response.json({ error: { message: err.message } }, { status: err.status || 500 })
  }

  async doPost(c, err) {
    if (this.opts.postTo) {
      let postTo = this.opts.postTo
      postTo.options ||= {}
      postTo.options.method ||= 'POST'
      let options = { ...postTo.options }
      let message = `${err.name}: ${err.message}

${err.stack}`
      if (options.body) {
        options.body = options.body(message)
      }
      let filenameAndLineNumbers = err.stack.split('\n').find((l) => l.match(/.*:\d+:\d+/))
      // console.log('ErrorHandler: filenameAndLineNumbers:', filenameAndLineNumbers)
      if (c.env.KV) {
        // console.log('checking KV for duplicates')
        let key = `errors/${filenameAndLineNumbers}`
        let errorKV = await c.env.KV.get(key)
        if (errorKV) {
          // console.log('found duplicate error, not posting')
          return
        }
        // console.log("posting to KV so we don't send duplicates")
        await c.env.KV.put(key, message, {
          expirationTtl: 60 * 60 * 24 * 2, // 2 days
        })
      }
      try {
        let r = await api(postTo.url, options)
      } catch (e) {
        console.log('ErrorHandler: error posting to postTo:', e)
      }
    }
  }
}
