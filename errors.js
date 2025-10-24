import api from 'api'
import { CloudflareLogger } from './logger.js'

/**
 * Error handler for Cloudflare Workers.
 *
 * - Prints to console nicely for Cloudflare logging
 * - Responds with nice error response based on ARF
 * - Posts to a webhook if configured (ie: into a chat) and only once per 2 days per error.
 *
 */
export class ErrorHandler {
  constructor(opts = {}) {
    this.opts = opts
    this.logger = this.opts.logger || new CloudflareLogger()
  }

  /**
   * This will log the error, post an alert to a webhook if postTo is set and respond with a JSON error response.
   *
   * @param {*} c
   * @param {*} err
   * @returns
   */
  async handle(c, err) {
    await this.logc(c, err)
    return Response.json({ error: { message: err.message } }, { status: err.status || 500 })
  }

  /**
   * This will log and post to webhook, but does not generate a response. Good for use in
   * parts where you aren't throwing to exit, but just logging and continuing.
   *
   * Called it logc to keep log open for the future and stay compatible with regular logging.
   *
   * @param {*} c
   * @param {*} err
   * @returns
   */
  async logc(c, err) {
    this.logger.log(err.message, err)
    c.waitUntil(this.doPost(c, err))
  }

  async doPost(c, err) {
    // Do not post client errors (status < 500) to the webhook.
    if (err.status && err.status < 500) return
    // console.log('POST TO:', this.opts.postTo)
    if (this.opts.postTo) {
      let postTo = this.opts.postTo
      postTo.options ||= {}
      postTo.options.method ||= 'POST'
      let options = { ...postTo.options }

      let dataStr = this.logger.data ? '\n\n' + JSON.stringify(this.logger.data, null, '  ') : ''

      let message = `${err.name}: ${err.message}${dataStr}\n\n${err.stack}`
      if (this.opts.appName) message = `${this.opts.appName}\n${message}`

      if (options.body) {
        options.body = options.body(message)
      }

      let filenameAndLineNumbers = err.stack.split('\n').find((l) => l.match(/.*:\d+:\d+/))
      // console.log('ErrorHandler: filenameAndLineNumbers:', filenameAndLineNumbers)
      if (!this.opts.force && c.env.KV) {
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
        // console.log('about to post', postTo.url)
        let r = await api(postTo.url, options)
        console.log('ErrorHandler: response from postTo:', r)
      } catch (e) {
        console.log('ErrorHandler: error posting to postTo:', e)
      }
    }
  }
}
