import { awaitAll } from './utils.js'

export class Scheduler {
  // not using default EventTarget because it's hard to handle asynchronous stuff well.
  // extends EventTarget {
  listeners = {
    minutely: [],
    hourly: [],
    daily: [],
    weekly: [],
    monthly: [],
    yearly: [],
  }
  constructor() {}

  /**
   *
   * @param {*} interval is a string like "minutely", "hourly", etc.
   * @param {*} listener an event listener that accepts a CustomEvent paramter
   */
  addEventListener(interval, listener) {
    this.listeners[interval].push(listener)
  }

  /**
   * @param {*} interval is a string like "minutely", "hourly", etc.
   * @param {*} listener the event listener to remove
   */
  removeEventListener(interval, listener) {
    this.listeners[interval] = this.listeners[interval].filter((h) => h !== listener)
  }

  dispatchEvent(evt) {
    let promises = []
    for (let handler of this.listeners[evt.type]) {
      promises.push(handler(evt))
    }
    return promises
  }

  /**
   * Call this from your handler endpoint to trigger a scheduled event.
   * @param {*} c
   * @param {*} input - the input to the handler
   * @param {*} input.cron - the cron string/expression that triggered this
   * @returns
   */
  async run(c, input) {
    let cron = input.cron.split(' ')
    if (!cron[4].startsWith('*')) {
      input.interval = 'week'
    } else if (!cron[2].startsWith('*')) {
      input.interval = 'month'
    } else if (!cron[1].startsWith('*')) {
      input.interval = 'day'
    } else if (!cron[0].startsWith('*')) {
      // could be 0 */1 * * * or 0 * * * *
      input.interval = 'hour'
    } else if (cron[0].startsWith('*')) {
      // could be * or */1 or */5 (every 5 minutes), etc. ie: * * * * *, or */1 * * * *
      input.interval = 'minute'
      let split = cron[0].split('/')
      if (split.length > 1) {
        input.subInterval = split[1]
      }
    }

    // NOW CALL THE SCHEDULE FUNCTIONS
    // Could be cool to have scheduler.addEventListener("minute", () => { ...")
    // input.c = c
    let evt = new CustomEvent(input.interval, { detail: input })
    evt.c = c
    // promises.push(dispatch(c, evt))
    // this doesn't seem to run!
    // c.waitUntil(awaitAll(c, scheduler.dispatchEvent(evt)))
    await awaitAll(c, this.dispatchEvent(evt))
  }
}
