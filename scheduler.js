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
   */
  addEventListener(interval, listener) {
    this.listeners[interval] ||= []
    this.listeners[interval].push(listener)
  }

  /**
   * @param {*} interval is a string like "minute", "hour", etc.
   * @param {*} listener the event listener to remove
   */
  removeEventListener(interval, listener) {
    if (!this.listeners[interval]) return
    this.listeners[interval] = this.listeners[interval].filter((h) => h !== listener)
  }

  dispatchEvent(evt) {
    let promises = []
    if (!this.listeners[evt.type]) return promises
    for (let handler of this.listeners[evt.type]) {
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

    // this works if we're looking at the cron trigger:
    // let cron = input.cron.split(' ')
    // if (!cron[4].startsWith('*')) {
    //   input.interval = 'week'
    // } else if (!cron[2].startsWith('*')) {
    //   input.interval = 'month'
    // } else if (!cron[1].startsWith('*')) {
    //   input.interval = 'day'
    // } else if (!cron[0].startsWith('*')) {
    //   // could be 0 */1 * * * or 0 * * * *
    //   input.interval = 'hour'
    // } else if (cron[0].startsWith('*')) {
    //   // could be * or */1 or */5 (every 5 minutes), etc. ie: * * * * *, or */1 * * * *
    //   input.interval = 'minute'
    //   let split = cron[0].split('/')
    //   if (split.length > 1) {
    //     input.subInterval = split[1]
    //   }
    // }

    // but better to set a single trigger and then we run decide here

    let promises = []

    // We'll always run the minute ones:
    let evt = new ScheduledEvent(c, 'minute', controller)
    promises.push(...this.dispatchEvent(evt))

    if (st.getMinutes() === 0) {
      evt = new ScheduledEvent(c, 'hour', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getMinutes() === 0 || st.getMinutes() % 5 === 0) {
      // todo: support subintervals like this, every 5 minutes
      evt = new ScheduledEvent(c, '5minutes', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getMinutes() === 0 || st.getMinutes() % 15 === 0) {
      evt = new ScheduledEvent(c, '15minutes', controller)
      promises.push(...this.dispatchEvent(evt))
    }
    if (st.getMinutes() === 0 && st.getHours() === 0) {
      // todo: should allow for which hour this triggers on, like 2am
      evt = new ScheduledEvent(c, 'day', controller)
      promises.push(...this.dispatchEvent(evt))
    }

    // Should we make a new event type here instead?
    /*
    class ScheduledEvent extends Event {
      constructor(c, input) {
        super(type, {})
        this.input = input or this.detail = input
        this.c = c
      }
    } 
    */

    // waitUntil doesn't seem to be working here... 🤔
    // c.waitUntil(awaitAll(c, this.dispatchEvent(evt)))
    await awaitAll(c, promises)
  }
}

class ScheduledEvent extends Event {
  constructor(c, type, controller) {
    super(type)
    this.controller = controller
    this.c = c
    this.detail = this.controller
  }
}
