import { verifyIdToken, getAccessToken } from "web-auth-library/google"

/**
 * Logger for posting to Google Cloud logging. 
 * 
 * TODO: move to separate repo like console-logger.
 */
export class GoogleLogger {

  constructor(options = {}) {
    this.options = options
    this.apiURL = `https://logging.googleapis.com/v2`
  }

  async fetch(c, url, opts = {}) {
    // console.log("PROJECT:", this.options.gCreds)
    const accessToken = await getAccessToken({
      credentials: this.options.gCreds, // GCP service account key (JSON)
      scope: "https://www.googleapis.com/auth/cloud-platform",
      waitUntil: async (p) => c.waitUntil(p), // allows the token to be refreshed in the background
    })

    // url += `/${query.id}`
    opts.headers ||= {}
    opts.headers.Authorization = `Bearer ${accessToken}`
    // if (opts.body) opts.body = JSON.stringify(opts.body)
    // console.log("URL:", url)
    // console.log("opts:", opts)
    const res = await fetch(url, opts)
    // console.log("RES:", res)
    if (!res.ok) {
      console.error("Error fetching", url, res.status, res.statusText)
      throw new Error(`Error posting to Google Cloud Logging: ${res.statusText}`)
    }
    const json = await res.json()
    // console.log("JSON:", json)
    if (!res.ok) throw (json.error || json[0].error)
    return json
  }

  // Can add more details: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
  // todo: should batch up entries, google recomends it
  async write(c, payload, opts = {}) {
    console.log(payload)
    let b = {
      logName: `projects/${this.options.gCreds.project_id}/logs/${this.options.logName}`,
      resource: this.options.resource,
      entries: []
    }

    let error = null
    if (payload instanceof Error) {
      error = payload
      payload = {
        message: error.message,
        stack: error.stack,
      }
    }
    if (payload.error) {
      error = payload.error
    }
    if (error) {
      if (error.cause) {
        console.log("Cause found", error.cause.stack)
        payload.message = payload.message + ": " + error.cause.message
        payload.stack = error.cause.stack
      }
      opts.severity ||= "ERROR"
    }
    let entry = {
      severity: opts.severity || "INFO",
    }
    if (typeof payload == "string") {
      entry.textPayload = payload
    } else {
      // NOTE: if object has "message" field, that will show up normal in logging interface, same as textPayload above
      // If we check if this is an error, we can put message in the message field and set severity to error. 
      entry.jsonPayload = payload
    }
    // console.log("payload:", payload)
    // console.log("stringified:", JSON.stringify(payload))
    // console.log("ENTRY", entry)
    b.entries.push(entry)
    // console.log("WRITING", b)
    // console.log("stringified", JSON.stringify(entry))
    let url = `${this.apiURL}/entries:write`
    let opts2 = {
      method: "POST",
      body: JSON.stringify(b),
      // headers: {
      //     "Content-Type": "application/json",
      // }
    }
    try {
      return await this.fetch(c, url, opts2)
    } catch (e) {
      console.error("Error writing log", e)
      console.error("PAYLOAD:", payload)
    }
  }
}
