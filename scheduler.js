import { awaitAll } from './utils.js'

/**
 * This is a helper to let you run things at various times on a single cron trigger from Cloudflare.
 *
 * For instance, if you set the cron trigger to every minute, you can use this to run things at various times.
 */
export class Scheduler {
  // not using default EventTarget because it's hard to handle asynchronous stuff well.
  // extends EventTarget {
  listeners = {}
  constructor() {}

  /**
   *
   * @param {*} interval is a string like "minute", "hour", "day", etc.
   * @param {*} listener an event listener that accepts a CustomEvent paramter
   * @param {*} [options] optional configuration for this listener (e.g. { hour: 2 })
   */
  addEventListener(interval, listener, options = {}) {
    this.listeners[interval] ||= []
    this.listeners[interval].push({ listener, options })
  }

  /**
   * @param {*} interval is a string like "minute", "hour", etc.
   * @param {*} listener the event listener to remove
   */
  removeEventListener(interval, listener) {
    if (!this.listeners[interval]) return
    this.listeners[interval] = this.listeners[interval].filter(
      (h) => (typeof h === 'function' ? h : h.listener) !== listener
    )
  }

  dispatchEvent(evt) {
    let promises = []
    if (!this.listeners[evt.type]) return promises
    const evtHour =
      evt.hour !== undefined
        ? evt.hour
        : evt.controller?.scheduledTime
          ? new Date(evt.controller.scheduledTime).getUTCHours()
          : new Date().getUTCHours()

    for (let entry of this.listeners[evt.type]) {
      const handler = typeof entry === 'function' ? entry : entry.listener
      const options = typeof entry === 'function' ? {} : entry.options || {}

      if (evt.type === 'day') {
        const targetHour = options.hour ?? 0
        if (evtHour !== targetHour) {
          continue
        }
      }

      promises.push(handler(evt))
    }
    return promises
  }

  /**
   * Call this from your handler endpoint to trigger a scheduled event.
   * @param {*} c
   * @param {*} controller - the input to the handler - ie: the controller
   * @returns
   */
  async run(c, controller) {
    let st = new Date(controller.scheduledTime)

    let promises = []

    // We'll always run the minute ones:
    let evt = new ScheduledEvent(c, 'minute', controller)
    promises.push(...this.dispatchEvent(evt))

    if (st.getUTCMinutes() === 0) {
      evt = new ScheduledEvent(c, 'hour', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getUTCMinutes() === 0 || st.getUTCMinutes() % 5 === 0) {
      // todo: support subintervals like this, every 5 minutes
      evt = new ScheduledEvent(c, '5minutes', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getUTCMinutes() === 0 || st.getUTCMinutes() % 10 === 0) {
      evt = new ScheduledEvent(c, '10minutes', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getUTCMinutes() === 0 || st.getUTCMinutes() % 15 === 0) {
      evt = new ScheduledEvent(c, '15minutes', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getUTCMinutes() === 0) {
      evt = new ScheduledEvent(c, 'day', controller)
      promises.push(...this.dispatchEvent(evt))
    }

    await awaitAll(c, promises)
  }
}

class ScheduledEvent extends Event {
  constructor(c, type, controller) {
    super(type)
    this.controller = controller
    this.c = c
    this.detail = this.controller
    if (controller?.scheduledTime) {
      this.hour = new Date(controller.scheduledTime).getUTCHours()
    }
  }
}
